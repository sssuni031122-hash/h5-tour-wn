(function () {
  "use strict";

  const config = window.H5_CONFIG;
  const screen = document.getElementById("screen");
  const toast = document.getElementById("toast");
  const submitMask = document.getElementById("submitMask");
  const state = {
    route: "home",
    spotId: null,
    routeFilter: "全部点位",
    entryType: null,
    sourceSpotId: null,
    selectedFile: null,
    toastTimer: null,
  };

  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function assetSlot(src, label, className = "") {
    return `
      <div class="asset-slot ${className}" data-asset="${escapeHtml(src)}">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" hidden />
        <span class="asset-label">${escapeHtml(label)}<br />${escapeHtml(src)}</span>
      </div>`;
  }

  function hydrateAssets() {
    document.querySelectorAll(".asset-slot img").forEach((image) => {
      const slot = image.closest(".asset-slot");
      const label = slot?.querySelector(".asset-label");
      const reveal = () => {
        image.hidden = false;
        if (label) label.hidden = true;
      };
      const fallback = () => {
        image.hidden = true;
        if (label) label.hidden = false;
      };
      if (image.complete) {
        image.naturalWidth > 0 ? reveal() : fallback();
      } else {
        image.addEventListener("load", reveal, { once: true });
        image.addEventListener("error", fallback, { once: true });
      }
    });
  }

  function pageHeader(title, count = "") {
    return `
      <header class="page-header">
        <button class="icon-button" type="button" data-action="back" aria-label="返回">‹</button>
        <h2>${escapeHtml(title)}</h2>
        <span class="page-count">${escapeHtml(count)}</span>
      </header>`;
  }

  function renderHome() {
    screen.innerHTML = `
      <section class="screen screen-home" data-screen="home">
        <span class="wireframe-badge">H5 功能测试版 · 视觉待替换</span>
        <div class="hero-copy">
          <p class="eyebrow">麦穗儿带你看渭南</p>
          <h1>${escapeHtml(config.activity.title)}</h1>
          <p>${escapeHtml(config.activity.subtitle)}</p>
        </div>
        ${assetSlot(config.assets.home, "P1 首页主视觉", "home-art")}
        <div class="home-actions" aria-label="主要入口">
          <button class="entry-card" type="button" data-nav="overview">
            <span class="entry-number">01</span>
            <strong>跟着麦穗儿游渭南</strong>
            <small>看八个点位，听八段故事</small>
          </button>
          <button class="entry-card" type="button" data-nav="entry">
            <span class="entry-number">02</span>
            <strong>跟着麦穗儿抽大奖</strong>
            <small>查看参与方式并提交照片</small>
          </button>
        </div>
      </section>`;
  }

  function renderOverview() {
    const routes = ["全部点位", "山河东线", "黄河人文线", "文明非遗线"];
    const spots = state.routeFilter === "全部点位"
      ? config.spots
      : config.spots.filter((spot) => spot.route === state.routeFilter);

    screen.innerHTML = `
      <section class="screen" data-screen="overview">
        ${pageHeader("游渭南", "P2")}
        <div class="page-body">
          <p class="eyebrow">收集渭南的八个字</p>
          <h1 class="page-title">选一站，去看看</h1>
          <p class="page-intro">字、火、粮、史、情、华、关、家。点击卡片查看景点故事。</p>
          ${assetSlot(config.assets.overview, "P2 景点总览图 / 路线图", "overview-art")}
          <div class="route-chips" aria-label="路线筛选">
            ${routes.map((route) => `
              <button class="route-chip ${route === state.routeFilter ? "active" : ""}" type="button" data-route-filter="${escapeHtml(route)}">
                ${escapeHtml(route)}
              </button>`).join("")}
          </div>
          <div class="spot-grid">
            ${spots.map((spot, index) => `
              <button class="spot-card" type="button" data-spot="${escapeHtml(spot.id)}" aria-label="查看${escapeHtml(spot.name)}">
                ${assetSlot(spot.asset, `${spot.name}图片`, "")}
                <span class="spot-card-copy">
                  <span class="spot-keyword">${escapeHtml(spot.keyword)}</span>
                  <strong>${escapeHtml(spot.name)}</strong>
                  <small>${escapeHtml(spot.hook)}</small>
                </span>
              </button>`).join("")}
          </div>
          ${spots.length === 0 ? "<p class=\"muted\">该路线暂无点位。</p>" : ""}
        </div>
      </section>`;
  }

  function renderDetail() {
    const spot = config.spots.find((item) => item.id === state.spotId) || config.spots[0];
    const number = config.spots.findIndex((item) => item.id === spot.id) + 1;
    screen.innerHTML = `
      <section class="screen" data-screen="detail" data-spot-id="${escapeHtml(spot.id)}">
        ${pageHeader(spot.name, `P3-${number}`)}
        ${assetSlot(spot.asset, `P3-${number} ${spot.name}详情主图`, "detail-hero")}
        <div class="detail-title-wrap">
          <div class="detail-title-card">
            <span class="keyword-seal">${escapeHtml(spot.keyword)}</span>
            <h1>${escapeHtml(spot.name)}</h1>
            <p>${escapeHtml(spot.hook)}</p>
          </div>
        </div>
        <div class="content-stack">
          <article class="content-card">
            <h3>麦穗儿讲故事</h3>
            <p>此处为景点故事文案区域。正式文案与分层视觉到位后，可在不改变页面结构的情况下直接替换。</p>
          </article>
          <article class="content-card">
            <h3>到了看什么</h3>
            <ul><li>视觉看点占位 01</li><li>视觉看点占位 02</li><li>视觉看点占位 03</li></ul>
          </article>
          <article class="content-card">
            <h3>拍照建议</h3>
            <p>此处为拍摄位置、画面建议与安全提示占位。「游渭南」页面不出现上传控件。</p>
          </article>
        </div>
        <div class="detail-actions">
          <button class="secondary-button" type="button" data-action="navigation-placeholder">打开导航</button>
          <button class="primary-button" type="button" data-action="join-from-spot" data-spot="${escapeHtml(spot.id)}">了解抽奖玩法</button>
        </div>
      </section>`;
  }

  function renderEntry() {
    screen.innerHTML = `
      <section class="screen" data-screen="entry">
        ${pageHeader("抽大奖", "P4")}
        <div class="page-body">
          <p class="eyebrow">${escapeHtml(config.activity.date)}</p>
          <h1 class="page-title">跟着麦穗儿抽大奖</h1>
          <p class="page-intro">拍下你的渭南时刻，选择对应的参与方式上传。</p>
          ${assetSlot(config.assets.prize, "P4 奖品 / 参与方式主视觉", "prize-art")}
          <div class="step-list" aria-label="参与步骤">
            <div class="step-item"><span>1</span><div><strong>去打卡</strong><small>前往推荐的 8 个点位中任意一个。</small></div></div>
            <div class="step-item"><span>2</span><div><strong>拍照片</strong><small>拍摄本人在活动期内完成的原创照片。</small></div></div>
            <div class="step-item"><span>3</span><div><strong>选方式</strong><small>普通打卡照片或社交媒体发布截图。</small></div></div>
            <div class="step-item"><span>4</span><div><strong>上传提交</strong><small>填写联系信息后上传 1 张图片。</small></div></div>
          </div>

          <div class="choice-heading">
            <h2>请选择参与方式</h2>
            <p>每次只能提交 1 张图片，提交成功后可继续上传。</p>
          </div>
          <div class="choice-list">
            <button class="choice-card" type="button" data-entry-type="photo">
              <span class="choice-card-icon">📷</span>
              <span><strong>普通打卡照片</strong><small>上传你在渭南打卡拍摄的照片。</small><span class="weight-pill">1 个抽奖权重</span></span>
              <span aria-hidden="true">›</span>
            </button>
            <button class="choice-card" type="button" data-entry-type="social_share">
              <span class="choice-card-icon">📱</span>
              <span><strong>社交媒体发布截图</strong><small>上传带指定话题的公开发布截图。</small><span class="weight-pill">2 个抽奖权重</span></span>
              <span aria-hidden="true">›</span>
            </button>
          </div>
          <p class="rules-note">同一手机号按北京时间每天最多成功提交 3 次。每次成功提交都会生成一个独立编号。</p>
        </div>
      </section>`;
  }

  function entryLabel() {
    return state.entryType === "social_share" ? "社交媒体发布截图 · 权重 2" : "普通打卡照片 · 权重 1";
  }

  function renderForm() {
    if (!state.entryType) state.entryType = "photo";
    const spot = config.spots.find((item) => item.id === state.sourceSpotId);
    screen.innerHTML = `
      <section class="screen" data-screen="form">
        ${pageHeader("填写信息", "P5")}
        <div class="page-body">
          <p class="eyebrow">最后一步</p>
          <h1 class="page-title">上传你的渭南时刻</h1>
          <p class="page-intro">请确保姓名、手机号与图片填写正确。</p>
          ${assetSlot(config.assets.form, "P5 信息填写页主视觉", "form-art")}
          <div class="selected-summary">
            <div><small>已选参与方式</small><strong>${escapeHtml(entryLabel())}</strong>${spot ? `<small>来自：${escapeHtml(spot.name)}</small>` : ""}</div>
            <button class="text-button" type="button" data-nav="entry">更换</button>
          </div>
          <div class="status-banner" id="statusBanner" role="alert"></div>
          <form class="form-card" id="submissionForm" novalidate>
            <input type="hidden" name="entryType" value="${escapeHtml(state.entryType)}" />
            <div class="form-group">
              <label class="field-label" for="name">联系人 / 姓名 <span class="required">*</span></label>
              <input id="name" name="name" type="text" maxlength="30" autocomplete="name" placeholder="请输入30个字以内的姓名" />
              <p class="field-error" data-error-for="name"></p>
            </div>
            <div class="form-group">
              <label class="field-label" for="phone">手机号 <span class="required">*</span></label>
              <input id="phone" name="phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel" placeholder="请输入11位中国大陆手机号" />
              <p class="field-error" data-error-for="phone"></p>
            </div>
            <div class="form-group">
              <span class="field-label">上传图片 <small>JPG / PNG / WebP / HEIC，最大10MB</small></span>
              <label class="upload-zone" id="uploadZone" for="photo">
                <span class="upload-icon">+</span>
                <span class="upload-copy"><strong id="fileName">点击选择1张图片</strong><small id="fileMeta">选中后可重新选择</small></span>
              </label>
              <input class="visually-hidden" id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" />
              <p class="field-error" data-error-for="photo"></p>
            </div>
            <label class="consent-row">
              <input id="consent" name="consent" type="checkbox" />
              <span>我已阅读并同意：姓名、手机号和上传图片仅用于本次活动联系、作品收集与审核，不在公开页面展示。</span>
            </label>
            <p class="field-error" data-error-for="consent"></p>
            <p class="data-note">每次提交1张图片，同一手机号每天最多成功提交3次。请勿重复点击提交。</p>
            <button class="primary-button submit-button" id="submitButton" type="submit">确认提交</button>
          </form>
        </div>
      </section>`;

    const fileInput = document.getElementById("photo");
    fileInput.addEventListener("change", handleFileChange);
    document.getElementById("submissionForm").addEventListener("submit", handleSubmit);
  }

  function renderSuccess(code) {
    screen.innerHTML = `
      <section class="screen" data-screen="success">
        ${pageHeader("提交结果", "")}
        <div class="success-screen">
          <div class="success-card" role="status">
            <span class="success-mark">✓</span>
            <h1>提交成功</h1>
            <p class="muted">你的图片和联系信息已收到。请保存本次独立编号。</p>
            <strong class="success-code">提交编号：${escapeHtml(code)}</strong>
            <div class="success-actions">
              <button class="primary-button" type="button" data-action="submit-another">继续上传下一张</button>
              <button class="secondary-button" type="button" data-nav="home">返回首页</button>
            </div>
          </div>
        </div>
      </section>`;
  }

  function render() {
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
    } else if (["home", "overview", "entry", "form"].includes(route)) {
      state.route = route;
    } else {
      state.route = "home";
    }
  }

  function hashFor(route, value) {
    return route === "detail" ? `#/spot/${value}` : `#/${route}`;
  }

  function navigate(route, options = {}) {
    if (options.spotId) state.spotId = options.spotId;
    if (options.entryType) state.entryType = options.entryType;
    if (Object.prototype.hasOwnProperty.call(options, "sourceSpotId")) state.sourceSpotId = options.sourceSpotId;
    const nextHash = hashFor(route, options.spotId || state.spotId);
    if (location.hash === nextHash) {
      state.route = route;
      window.scrollTo(0, 0);
      render();
      return;
    }
    location.hash = nextHash;
  }

  function goBack() {
    if (history.length > 1) history.back();
    else navigate("home");
  }

  function showToast(message) {
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    state.toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  function setFieldError(name, message) {
    const node = document.querySelector(`[data-error-for="${name}"]`);
    if (node) node.textContent = message;
  }

  function clearErrors() {
    document.querySelectorAll(".field-error").forEach((node) => { node.textContent = ""; });
    const banner = document.getElementById("statusBanner");
    if (banner) {
      banner.textContent = "";
      banner.className = "status-banner";
    }
  }

  function showFormStatus(message, type = "error") {
    const banner = document.getElementById("statusBanner");
    if (!banner) return;
    banner.textContent = message;
    banner.className = `status-banner show ${type}`;
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleFileChange(event) {
    clearErrors();
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    state.selectedFile = null;
    if (!file) return updateFileUI();

    const hasAllowedType = ALLOWED_TYPES.has(file.type) || (!file.type && ALLOWED_EXTENSIONS.test(file.name));
    if (!hasAllowedType) {
      input.value = "";
      setFieldError("photo", "仅支持 JPG、PNG、WebP、HEIC 或 HEIF 图片。");
      return updateFileUI();
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      input.value = "";
      setFieldError("photo", "图片大小需在 10MB 以内。");
      return updateFileUI();
    }
    state.selectedFile = file;
    updateFileUI();
  }

  function updateFileUI() {
    const zone = document.getElementById("uploadZone");
    const name = document.getElementById("fileName");
    const meta = document.getElementById("fileMeta");
    if (!zone || !name || !meta) return;
    zone.classList.toggle("has-file", Boolean(state.selectedFile));
    name.textContent = state.selectedFile?.name || "点击选择1张图片";
    meta.textContent = state.selectedFile ? `${formatFileSize(state.selectedFile.size)} · 点击可重新选择` : "选中后可重新选择";
  }

  function validateForm(form) {
    clearErrors();
    let valid = true;
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    if (!name || name.length > 30) {
      setFieldError("name", "请填写 30 个字以内的姓名。");
      valid = false;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setFieldError("phone", "请填写正确的 11 位中国大陆手机号。");
      valid = false;
    }
    if (!state.selectedFile && !localSubmitTestMode()) {
      setFieldError("photo", "请选择 1 张图片。");
      valid = false;
    }
    if (!form.elements.consent.checked) {
      setFieldError("consent", "请阅读并同意个人信息处理说明。");
      valid = false;
    }
    if (!valid) {
      const firstError = form.querySelector(".field-error:not(:empty)");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return valid;
  }

  function localSubmitTestMode() {
    if (location.hostname !== "127.0.0.1" && location.hostname !== "localhost") return "";
    return new URLSearchParams(location.search).get("testSubmit") || "";
  }

  async function submitFormData(form) {
    const testMode = localSubmitTestMode();
    if (testMode) {
      await new Promise((resolve) => setTimeout(resolve, 180));
      if (testMode === "success") return { code: "WN-20260807-TEST0001" };
      const testError = new Error(
        testMode === "limit"
          ? "同一手机号每天最多成功提交3次，请明天再试"
          : "测试网络异常，请检查失败状态展示。",
      );
      testError.status = testMode === "limit" ? 429 : 500;
      throw testError;
    }

    const response = await fetch(config.apiUrl, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.code) {
      const error = new Error(result.error || "提交失败，请稍后重试。");
      error.status = response.status;
      throw error;
    }
    return result;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;

    const button = document.getElementById("submitButton");
    button.disabled = true;
    button.textContent = "提交中…";
    submitMask.classList.add("show");
    submitMask.setAttribute("aria-hidden", "false");

    try {
      const result = await submitFormData(form);
      state.selectedFile = null;
      renderSuccess(result.code);
      window.scrollTo(0, 0);
    } catch (error) {
      const isLimit = error && error.status === 429;
      showFormStatus(error?.message || "网络异常，请检查网络后重试。", isLimit ? "limit" : "error");
    } finally {
      button.disabled = false;
      button.textContent = "确认提交";
      submitMask.classList.remove("show");
      submitMask.setAttribute("aria-hidden", "true");
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;
    if (target.dataset.action === "back") return goBack();
    if (target.dataset.action === "navigation-placeholder") return showToast("导航链接待活动方确认");
    if (target.dataset.action === "join-from-spot") {
      state.sourceSpotId = target.dataset.spot;
      return navigate("entry", { sourceSpotId: target.dataset.spot });
    }
    if (target.dataset.action === "submit-another") {
      state.selectedFile = null;
      return navigate("form");
    }
    if (target.dataset.nav) {
      if (target.dataset.nav === "home") {
        state.entryType = null;
        state.sourceSpotId = null;
      }
      return navigate(target.dataset.nav);
    }
    if (target.dataset.spot) return navigate("detail", { spotId: target.dataset.spot });
    if (target.dataset.entryType) {
      state.entryType = target.dataset.entryType;
      state.selectedFile = null;
      return navigate("form", { entryType: target.dataset.entryType });
    }
    if (target.dataset.routeFilter) {
      state.routeFilter = target.dataset.routeFilter;
      return render();
    }
  });

  window.addEventListener("hashchange", () => {
    routeFromHash();
    window.scrollTo(0, 0);
    render();
  });

  routeFromHash();
  render();
  requestAnimationFrame(() => document.getElementById("loadingScreen").classList.add("hide"));
})();
