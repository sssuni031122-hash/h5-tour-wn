(function () {
  "use strict";

  const config = window.H5_CONFIG;
  const screen = document.getElementById("screen");
  const submitMask = document.getElementById("submitMask");
  const successModal = document.getElementById("successModal");
  const successCode = document.getElementById("successCode");
  const viewCounter = document.getElementById("viewCounter");
  const viewCount = document.getElementById("viewCount");
  const privacyModal = document.getElementById("privacyModal");
  const privacyModalConsent = document.getElementById("privacyModalConsent");
  const privacyModalConfirm = document.getElementById("privacyModalConfirm");
  const state = { route: "home", spotId: null, entryType: null, selectedFile: null, transitionTimer: null, preloadedImages: [], preloadedSources: new Set() };
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  const allowedExtensions = /\.(jpe?g|png|webp|heic|heif)$/i;
  const maxFileSize = 10 * 1024 * 1024;
  let visitRefreshTimer = null;

  /* ── 微信 WeixinJSBridge 就绪检测 ── */
  var wechatBridgeReady = false;
  if (window.WeixinJSBridge && typeof window.WeixinJSBridge.invoke === "function") {
    wechatBridgeReady = true;
  }
  if (typeof document !== "undefined") {
    document.addEventListener("WeixinJSBridgeReady", function () {
      wechatBridgeReady = true;
    });
  }

  function renderVisitCount(count) {
    const safeCount = Number(count);
    if (!Number.isSafeInteger(safeCount) || safeCount < 0) return;
    viewCount.textContent = safeCount.toLocaleString("zh-CN");
    viewCounter.hidden = false;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(payload?.error || "请求失败，请稍后重试");
    return payload;
  }

  async function syncVisitCount(action) {
    try {
      const payload = await fetchJson(`${config.apiBase}${config.visitPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (payload.ok) renderVisitCount(payload.count);
    } catch (_) {
      // 浏览量不是核心功能；同步失败时保持隐藏，不影响用户浏览和提交。
    }
  }

  function startVisitCounter() {
    syncVisitCount("record");
    const interval = Number(config.visitRefreshInterval) || 3 * 60 * 1000;
    visitRefreshTimer = window.setInterval(() => syncVisitCount("read"), interval);
  }

  function extensionFor(file) {
    const byType = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };
    return byType[file.type] || file.name.split(".").pop()?.toLowerCase() || "bin";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function assetSlot(src, className = "") {
    return `<div class="asset-slot ${className}"><img src="${escapeHtml(src)}" alt="" aria-hidden="true" hidden /></div>`;
  }

  function hydrateAssets() {
    document.querySelectorAll(".asset-slot img").forEach((image) => {
      const reveal = () => { image.hidden = false; };
      const fallback = () => { image.hidden = true; };
      if (image.complete) image.naturalWidth > 0 ? reveal() : fallback();
      else {
        image.addEventListener("load", reveal, { once: true });
        image.addEventListener("error", fallback, { once: true });
      }
    });
  }

  function preloadImages(sources, priority = "low") {
    sources.forEach((src) => {
      if (!src || state.preloadedSources.has(src)) return;
      state.preloadedSources.add(src);
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = priority;
      image.src = src;
      state.preloadedImages.push(image);
    });
  }

  function preloadOverviewAssets() {
    preloadImages([config.assets.overview, ...config.spots.map((spot) => spot.buttonAsset)].filter(Boolean));
  }

  function preloadDetailAssets() {
    preloadImages([
      ...config.spots.map((spot) => spot.asset),
      config.assets.detailBackButton,
      config.assets.detailCheckinButton,
    ].filter(Boolean), "low");
  }

  function scheduleDetailPreload() {
    const run = () => preloadDetailAssets();
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1800 });
    else window.setTimeout(run, 1200);
  }

  function scheduleGalleryPreload() {
    const photos = Array.isArray(config.galleryPhotos) ? config.galleryPhotos.filter(Boolean) : [];
    if (!photos.length) return;
    const run = () => preloadImages(photos, "low");
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 650 });
    else window.setTimeout(run, 300);
  }

  function scheduleOverviewPreload() {
    const run = () => preloadOverviewAssets();
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 900 });
    else window.setTimeout(run, 350);
  }

  function renderHome() {
    screen.innerHTML = `
      <section class="screen screen-home" data-screen="home">
        <div class="p1-design">
          <img src="${escapeHtml(config.assets.home)}" alt="6000年渭南一朵花" width="750" height="2298" decoding="async" fetchpriority="high" />
          <div class="p1-petals" aria-hidden="true">
            <img class="p1-petals-layer" src="${escapeHtml(config.assets.homePetals)}" alt="" decoding="async" />
          </div>
          <button class="p1-hotspot p1-hotspot-tour" type="button" data-nav="overview" aria-label="游渭南"><img src="${escapeHtml(config.assets.homeTourButton)}" alt="" /></button>
          <button class="p1-hotspot p1-hotspot-prize" type="button" data-nav="entry" aria-label="抽大奖"><img src="${escapeHtml(config.assets.homePrizeButton)}" alt="" /></button>
        </div>
      </section>`;
  }

  function renderOverview() {
    const overviewOrder = ["huashan", "cangjiemiao", "qiachuan", "hancheng", "fengtuyicang", "tongguan", "yaotouyao", "laojie"];
    const overviewSpots = overviewOrder.map((id) => config.spots.find((spot) => spot.id === id));
    screen.innerHTML = `
      <section class="screen" data-screen="overview">
        <div class="p2-design">
          <img class="p2-design-background p2-design-background-top" src="${escapeHtml(config.assets.overview)}" alt="游渭南" width="750" height="2150" decoding="async" fetchpriority="high" />
          <img class="p2-design-background p2-design-background-bottom" src="${escapeHtml(config.assets.overview)}" alt="" width="750" height="2150" decoding="async" fetchpriority="high" aria-hidden="true" />
          <div class="p2-clouds" aria-hidden="true">
            <span class="p2-cloud p2-cloud-1"></span>
            <span class="p2-cloud p2-cloud-2"></span>
            <span class="p2-cloud p2-cloud-3"></span>
            <span class="p2-cloud p2-cloud-4"></span>
            <span class="p2-cloud p2-cloud-5"></span>
            <span class="p2-cloud p2-cloud-6"></span>
          </div>
          <button class="p2-gallery-entry" type="button" data-action="open-gallery" aria-label="来看看大家是怎么打卡拍照的">
            <span class="p2-gallery-entry-icon" aria-hidden="true">📷</span>
            <span><strong>来看看大家怎么打卡拍照</strong><small>点击查看照片</small></span>
            <span class="p2-gallery-entry-arrow" aria-hidden="true">›</span>
          </button>
          <div class="p2-spot-buttons">
            ${overviewSpots.map((spot, index) => `
              <button class="p2-spot-button p2-spot-button-${index + 1}" type="button" data-spot="${escapeHtml(spot.id)}" aria-label="${escapeHtml(spot.name)}">
                <img src="${escapeHtml(spot.buttonAsset)}" alt="" />
              </button>`).join("")}
          </div>
          <div class="p2-gallery-modal" id="p2GalleryModal" aria-hidden="true">
            <div class="p2-gallery-dialog" role="dialog" aria-modal="true" aria-labelledby="p2GalleryTitle">
              <button class="p2-gallery-close" type="button" data-action="close-gallery" aria-label="关闭照片页面">×</button>
              <h2 id="p2GalleryTitle">来看看大家怎么拍</h2>
              <div class="p2-gallery-list" id="p2GalleryList"></div>
            </div>
            <div class="p2-photo-lightbox" id="p2PhotoLightbox" aria-hidden="true">
              <button class="p2-photo-lightbox-close" type="button" data-action="close-photo" aria-label="关闭大图">×</button>
              <div class="p2-photo-lightbox-image" id="p2PhotoLightboxImage" role="img"></div>
            </div>
          </div>
        </div>
      </section>`;
    // 主画面完成后先缓存照片墙，再低优先级缓存详情页。
    scheduleGalleryPreload();
    scheduleDetailPreload();
  }

  function getGalleryItems() {
    const photos = Array.isArray(config.galleryPhotos) ? config.galleryPhotos.filter(Boolean) : [];
    const slotCount = Math.max(30, photos.length);
    return Array.from({ length: slotCount }, (_, index) => ({ src: photos[index] || "" }));
  }

  function openGallery() {
    const modal = document.getElementById("p2GalleryModal");
    const list = document.getElementById("p2GalleryList");
    if (!modal) return;
    if (list && !list.childElementCount) {
      const galleryItems = getGalleryItems();
      list.innerHTML = galleryItems.map((item, index) => `<button class="p2-gallery-photo${item.src ? "" : " p2-gallery-photo-placeholder"}" type="button" data-gallery-photo="${index}" aria-label="放大查看示例照片 ${index + 1}">${item.src ? `<img src="${escapeHtml(item.src)}" alt="示例照片 ${index + 1}" loading="lazy" decoding="async" />` : `<span>示例照片 ${index + 1}</span>`}</button>`).join("");
    }
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    modal.querySelector(".p2-gallery-close")?.focus();
  }

  function closeGallery() {
    const modal = document.getElementById("p2GalleryModal");
    if (!modal) return;
    closeGalleryPhoto();
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function openGalleryPhoto(indexValue) {
    const lightbox = document.getElementById("p2PhotoLightbox");
    const image = document.getElementById("p2PhotoLightboxImage");
    if (!lightbox || !image) return;
    const index = Number(indexValue);
    const item = getGalleryItems()[index];
    const number = index + 1;
    image.setAttribute("aria-label", `示例照片 ${number}`);
    image.innerHTML = item?.src ? `<img src="${escapeHtml(item.src)}" alt="示例照片 ${number}" />` : `<span>示例照片 ${number}</span>`;
    lightbox.classList.add("show");
    lightbox.setAttribute("aria-hidden", "false");
    lightbox.querySelector(".p2-photo-lightbox-close")?.focus();
  }

  function closeGalleryPhoto() {
    const lightbox = document.getElementById("p2PhotoLightbox");
    if (!lightbox) return;
    lightbox.classList.remove("show");
    lightbox.setAttribute("aria-hidden", "true");
  }

  function renderDetail() {
    const spot = config.spots.find((item) => item.id === state.spotId) || config.spots[0];
    screen.innerHTML = `
      <section class="screen spot-detail-screen" data-screen="detail" data-spot-id="${escapeHtml(spot.id)}">
        <div class="spot-detail-design">
          <img class="spot-detail-background" src="${escapeHtml(spot.asset)}" alt="${escapeHtml(spot.name)}" width="750" height="1890" decoding="async" fetchpriority="high" />
          <button class="spot-detail-back" type="button" data-action="go-back" aria-label="返回上一页">
            <img src="${escapeHtml(config.assets.detailBackButton)}" alt="返回" />
          </button>
          <button class="spot-detail-navigation" type="button" aria-label="在微信地图中查看${escapeHtml(spot.name)}">
            <span class="spot-detail-navigation-icon" aria-hidden="true">➤</span><span>导航</span>
          </button>
          <button class="spot-detail-checkin" type="button" data-action="join-from-spot" aria-label="我来啦！我要打卡！">
            <img src="${escapeHtml(config.assets.detailCheckinButton)}" alt="我来啦！我要打卡！" />
          </button>
        </div>
      </section>`;

    /* 直接绑定导航按钮点击事件（绕过事件委托，确保微信内可靠触发） */
    var navBtn = screen.querySelector(".spot-detail-navigation");
    if (navBtn) {
      navBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        invokeWechatLocation(spot);
      });
      /* 微信内 touch 事件兜底 */
      navBtn.addEventListener("touchend", function (e) {
        e.preventDefault();
        invokeWechatLocation(spot);
      });
    }
  }

  function renderEntry() {
    screen.innerHTML = `
      <section class="screen prize-screen" data-screen="entry">
        <div class="design-canvas prize-canvas">
          <img class="design-background" src="${escapeHtml(config.assets.prize)}" alt="抽大奖参与方式" width="1080" height="1920" decoding="async" fetchpriority="high" />
          <button class="design-back" type="button" data-nav="home" aria-label="返回首页">返回</button>
          <button class="prize-choice prize-choice-photo" type="button" data-entry-type="photo" aria-label="上传普通打卡照片">
            <img src="${escapeHtml(config.assets.prizePhotoButton)}" alt="啥也不想，传个照片再说" />
          </button>
          <button class="prize-choice prize-choice-social" type="button" data-entry-type="social_share" aria-label="上传社交媒体发布截图">
            <img src="${escapeHtml(config.assets.prizeSocialButton)}" alt="发布抖音、小红书或视频号截图" />
          </button>
        </div>
      </section>`;
  }

  function renderForm() {
    if (!state.entryType) state.entryType = "photo";
    screen.innerHTML = `
      <section class="screen form-screen" data-screen="form">
        <div class="design-canvas form-canvas">
          <img class="design-background" src="${escapeHtml(config.assets.form)}" alt="抽大奖资料提交表单" width="1080" height="1920" decoding="async" fetchpriority="high" />
          <button class="design-back" type="button" data-nav="entry" aria-label="返回参与方式">返回</button>
          <div class="status-banner" id="statusBanner" role="alert"></div>
          <form class="design-form" id="submissionForm" novalidate>
            <input type="hidden" name="entryType" value="${escapeHtml(state.entryType)}" />
            <div class="design-upload-wrap">
              <label class="design-upload" id="uploadZone" for="photo"><span class="design-upload-selected"><strong id="fileName">点击上传图片</strong><small id="fileMeta"></small></span></label>
              <input class="visually-hidden" id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" />
              <p class="field-error" data-error-for="photo"></p>
            </div>
            <div class="design-field design-field-name"><label class="visually-hidden" for="name">您的姓名</label><input id="name" name="name" type="text" maxlength="30" autocomplete="name" aria-label="您的姓名" /><p class="field-error" data-error-for="name"></p></div>
            <div class="design-field design-field-phone"><label class="visually-hidden" for="phone">联系电话</label><input id="phone" name="phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel" aria-label="联系电话" /><p class="field-error" data-error-for="phone"></p></div>
            <div class="design-consent">
              <label class="consent-row" for="consent">
                <input id="consent" name="consent" type="checkbox" required />
                <span>我同意收集姓名、手机号及图片，用于活动审核、抽奖与联系。</span>
              </label>
              <p class="field-error" data-error-for="consent"></p>
            </div>
            <button class="design-submit" id="submitButton" type="submit" aria-label="提交资料">
              <img src="${escapeHtml(config.assets.formSubmitButton)}" alt="提交" />
            </button>
          </form>
        </div>
      </section>`;
    document.getElementById("photo").addEventListener("change", handleFileChange);
    document.getElementById("submissionForm").addEventListener("submit", handleSubmit);
    document.getElementById("consent").addEventListener("click", handleConsentAttempt);
  }

  function renderSuccess(code) {
    screen.innerHTML = `<section class="screen" data-screen="success"><div class="success-screen"><div class="success-card"><span class="success-mark">✓</span><h1>抽大奖</h1><strong class="success-code">${escapeHtml(code)}</strong><button class="primary-button" type="button" data-nav="overview">游渭南</button></div></div></section>`;
  }

  function render() {
    closeSuccessModal();
    closePrivacyModal();
    if (state.route === "overview") renderOverview();
    else if (state.route === "detail") renderDetail();
    else if (state.route === "entry") renderEntry();
    else if (state.route === "form") renderForm();
    else renderHome();
    hydrateAssets();
    screen.focus({ preventScroll: true });
  }

  function routeFromHash() {
    const raw = location.hash.replace(/^#\/?/, "") || "home";
    const [route, value] = raw.split("/");
    if (route === "spot" && config.spots.some((spot) => spot.id === value)) {
      state.route = "detail";
      state.spotId = value;
    } else if (["home", "overview", "entry", "form"].includes(route)) state.route = route;
    else state.route = "home";
  }

  function navigate(route, value = "") {
    const nextHash = route === "detail" ? `#/spot/${value}` : `#/${route}`;
    if (state.route === "home" && (route === "overview" || route === "entry")) {
      clearTimeout(state.transitionTimer);
      screen.querySelector(".screen")?.classList.add("screen-leaving");
      state.transitionTimer = setTimeout(() => { location.hash = nextHash; }, 150);
      return;
    }
    location.hash = nextHash;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function invokeWechatLocation(spot) {
    var nav = spot && spot.navigation;
    if (!nav || !isFinite(nav.longitude) || !isFinite(nav.latitude)) {
      showToast("该景点坐标暂未配置");
      return;
    }
    if (!/MicroMessenger/i.test(navigator.userAgent)) return showToast("请在微信内打开页面使用导航");

    var lat = Number(nav.latitude);
    var lng = Number(nav.longitude);
    var locName = nav.name || spot.name || "";
    var locAddr = nav.address || "陕西省渭南市";

    function callOpenLocation() {
      if (!window.WeixinJSBridge || typeof window.WeixinJSBridge.invoke !== "function") {
        if (typeof wx !== "undefined" && typeof wx.openLocation === "function") {
          wx.openLocation({ latitude: lat, longitude: lng, name: locName, address: locAddr, scale: 14, infoUrl: "" });
        } else {
          showToast("微信地图加载失败，请返回重试");
        }
        return;
      }
      WeixinJSBridge.invoke("openLocation", {
        latitude: lat,
        longitude: lng,
        name: locName,
        address: locAddr,
        scale: 14
      }, function (res) {
        var msg = res && res.err_msg ? res.err_msg : "";
        if (msg.indexOf(":ok") === -1) {
          if (typeof wx !== "undefined" && typeof wx.openLocation === "function") {
            wx.openLocation({ latitude: lat, longitude: lng, name: locName, address: locAddr, scale: 14, infoUrl: "" });
          } else {
            showToast("未能打开微信地图，请稍后重试");
          }
        }
      });
    }

    if (window.WeixinJSBridge) {
      callOpenLocation();
    } else {
      document.addEventListener("WeixinJSBridgeReady", callOpenLocation);
      var attempts = 0;
      var timer = setInterval(function () {
        attempts++;
        if (window.WeixinJSBridge) { clearInterval(timer); callOpenLocation(); }
        else if (attempts >= 20) { clearInterval(timer); showToast("微信地图加载失败，请检查网络"); }
      }, 100);
    }
  }

  function setFieldError(name, message) {
    const node = document.querySelector(`[data-error-for="${name}"]`);
    if (node) node.textContent = message;
  }

  function clearErrors() {
    document.querySelectorAll(".field-error").forEach((node) => { node.textContent = ""; });
    const banner = document.getElementById("statusBanner");
    if (banner) { banner.textContent = ""; banner.className = "status-banner"; }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  function updateFileUI() {
    const zone = document.getElementById("uploadZone");
    const name = document.getElementById("fileName");
    const meta = document.getElementById("fileMeta");
    if (!zone || !name || !meta) return;
    zone.classList.toggle("has-file", Boolean(state.selectedFile));
    name.textContent = state.selectedFile?.name || "点击上传图片";
    meta.textContent = state.selectedFile ? formatFileSize(state.selectedFile.size) : "";
  }

  function handleFileChange(event) {
    clearErrors();
    const file = event.currentTarget.files?.[0];
    state.selectedFile = null;
    if (!file) return updateFileUI();
    const allowed = allowedTypes.has(file.type) || (!file.type && allowedExtensions.test(file.name));
    if (!allowed || file.size <= 0 || file.size > maxFileSize) {
      event.currentTarget.value = "";
      return updateFileUI();
    }
    state.selectedFile = file;
    updateFileUI();
  }

  function localSubmitTestMode() {
    if (!["127.0.0.1", "localhost"].includes(location.hostname)) return "";
    return new URLSearchParams(location.search).get("testSubmit") || "";
  }

  function validateForm(form) {
    clearErrors();
    let valid = true;
    if (!form.elements.name.value.trim() || form.elements.name.value.trim().length > 30) { setFieldError("name", "您的姓名"); valid = false; }
    if (!/^1[3-9]\d{9}$/.test(form.elements.phone.value.trim())) { setFieldError("phone", "联系电话"); valid = false; }
    if (!state.selectedFile && !localSubmitTestMode()) { setFieldError("photo", "点击上传图片"); valid = false; }
    if (!form.elements.consent.checked) { setFieldError("consent", "请阅读并勾选同意后再提交"); valid = false; }
    return valid;
  }

  async function submitFormData(form) {
    const testMode = localSubmitTestMode();
    if (testMode) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (testMode === "success") return { code: "WN-20260807-TEST0001" };
      throw new Error("抽大奖");
    }
    const apiBase = config.apiBase;
    const id = crypto.randomUUID();
    const day = new Date().toISOString().slice(0, 10);
    const cloudPath = `submissions-temp/${day}/${id}/photo.${extensionFor(state.selectedFile)}`;
    try {
      const tokenRes = await fetchJson(`${apiBase}${config.uploadTokenPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloudPath }),
      });
      const meta = tokenRes.data;
      if (!tokenRes.ok || !meta?.url) throw new Error("获取上传凭证失败，请稍后重试");
      const uploadRes = await fetch(meta.url, {
        method: "PUT",
        headers: {
          Authorization: meta.authorization,
          "x-cos-security-token": meta.token,
          "x-cos-meta-fileid": meta.cosFileId,
          "Content-Type": state.selectedFile.type || "application/octet-stream",
        },
        body: state.selectedFile,
      });
      if (!uploadRes.ok) throw new Error("图片上传失败，请稍后重试");
      const submitRes = await fetchJson(`${apiBase}${config.submitPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.elements.name.value.trim(),
          phone: form.elements.phone.value.trim(),
          entryType: form.elements.entryType.value,
          consent: form.elements.consent.checked,
          consentVersion: "2026-08-10-v2",
          photoFileId: meta.fileId,
          photoName: state.selectedFile.name,
          photoType: state.selectedFile.type,
          photoSize: state.selectedFile.size,
        }),
      });
      if (!submitRes.ok || !submitRes.code) throw new Error(submitRes.error || "提交失败，请稍后重试");
      return submitRes;
    } catch (error) {
      throw error;
    }
  }

  function openSuccessModal(code) {
    successCode.textContent = code;
    successModal.classList.add("show");
    successModal.setAttribute("aria-hidden", "false");
    document.getElementById("continueSubmit").focus();
  }

  function closeSuccessModal() {
    successModal.classList.remove("show");
    successModal.setAttribute("aria-hidden", "true");
  }

  function openPrivacyModal() {
    privacyModalConsent.checked = false;
    privacyModalConfirm.disabled = true;
    privacyModal.classList.add("show");
    privacyModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    document.getElementById("privacyModalClose").focus();
  }

  function closePrivacyModal() {
    privacyModal.classList.remove("show");
    privacyModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function handleConsentAttempt(event) {
    if (!event.currentTarget.checked) return;
    event.preventDefault();
    openPrivacyModal();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    const button = document.getElementById("submitButton");
    button.disabled = true;
    submitMask.classList.add("show");
    try {
      const result = await submitFormData(form);
      state.selectedFile = null;
      form.reset();
      updateFileUI();
      openSuccessModal(result.code);
    } catch (error) {
      const banner = document.getElementById("statusBanner");
      if (banner) { banner.textContent = error.message || "提交失败，请稍后重试"; banner.className = "status-banner show error"; }
    } finally {
      button.disabled = false;
      submitMask.classList.remove("show");
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.nav) return navigate(target.dataset.nav);
    if (target.dataset.action === "open-gallery") return openGallery();
    if (target.dataset.action === "close-gallery") return closeGallery();
    if (target.dataset.action === "close-photo") return closeGalleryPhoto();
    if (target.dataset.galleryPhoto) return openGalleryPhoto(target.dataset.galleryPhoto);
    if (target.dataset.spot) return navigate("detail", target.dataset.spot);
    if (target.dataset.action === "go-back") return history.back();
    if (target.dataset.action === "open-location") return invokeWechatLocation(config.spots.find((item) => item.id === state.spotId));
    if (target.dataset.action === "join-from-spot") return navigate("entry");
    if (target.dataset.entryType) { state.entryType = target.dataset.entryType; state.selectedFile = null; return navigate("form"); }
  });

  document.getElementById("continueSubmit").addEventListener("click", () => {
    closeSuccessModal();
    document.getElementById("photo")?.focus();
  });
  document.getElementById("returnHome").addEventListener("click", () => {
    closeSuccessModal();
    navigate("home");
  });

  privacyModalConsent.addEventListener("change", () => {
    privacyModalConfirm.disabled = !privacyModalConsent.checked;
  });
  document.getElementById("privacyModalClose").addEventListener("click", closePrivacyModal);
  document.getElementById("privacyModalCancel").addEventListener("click", closePrivacyModal);
  privacyModalConfirm.addEventListener("click", () => {
    if (!privacyModalConsent.checked) return;
    const pageConsent = document.getElementById("consent");
    if (pageConsent) pageConsent.checked = true;
    setFieldError("consent", "");
    closePrivacyModal();
    pageConsent?.focus();
  });
  privacyModal.addEventListener("click", (event) => {
    if (event.target === privacyModal) closePrivacyModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.getElementById("p2PhotoLightbox")?.classList.contains("show")) closeGalleryPhoto();
    else if (event.key === "Escape" && document.getElementById("p2GalleryModal")?.classList.contains("show")) closeGallery();
    else if (event.key === "Escape" && privacyModal.classList.contains("show")) closePrivacyModal();
  });

  window.addEventListener("hashchange", () => { routeFromHash(); window.scrollTo(0, 0); render(); });
  routeFromHash();
  render();
  scheduleOverviewPreload();
  startVisitCounter();
  requestAnimationFrame(() => document.getElementById("loadingScreen").classList.add("hide"));
})();
