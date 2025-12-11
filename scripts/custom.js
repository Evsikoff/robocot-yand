(function () {
  const styleId = 'robocot-cleanup-style';
  const logoStyleId = 'robocot-logo-style';
  const logoContainerId = 'robocot-logo-container';
  const mobileButtonStyleId = 'robocot-mobile-button-style';

  let ysdkPromise = null;
  let ysdkInstance = null;
  let gameplayApi = null;
  let loadingApi = null;
  let adApi = null;
  let loadingReadySent = false;
  let gameLoaded = document.readyState === 'complete';

  // Debug logging for WebView
  function debugLog(message, data) {
    console.log('[Robocot WebView]', message, data || '');
  }

  function waitForYaGamesSdk() {
    if (typeof YaGames !== 'undefined') {
      return Promise.resolve(YaGames);
    }

    debugLog('YaGames SDK not found on window, attempting to load dynamically');

    return new Promise((resolve) => {
      const existingScript = document.querySelector('script[src*="yandex.ru/games/sdk"]');

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(YaGames));
        existingScript.addEventListener('error', () => resolve(null));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://yandex.ru/games/sdk/v2';
      script.async = true;
      script.onload = () => resolve(YaGames);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  function initYsdk() {
    if (ysdkPromise) return ysdkPromise;

    ysdkPromise = waitForYaGamesSdk()
      .then((YaGames) => {
        if (!YaGames) {
          debugLog('YaGames SDK failed to load');
          return null;
        }

        // Set Russian locale without the deprecated top-level `lang` option.
        return YaGames.init({ i18n: { lang: 'ru' } });
      })
      .then((sdk) => {
        ysdkInstance = sdk;
        gameplayApi = sdk?.features?.GameplayAPI;
        loadingApi = sdk?.features?.LoadingAPI;
        adApi = sdk?.adv || sdk?.getAdManager?.();

        // Fallback for SDK versions that expect language to be set post-init.
        if (sdk?.environment?.i18n?.setLang) {
          sdk.environment.i18n.setLang('ru');
        }

        if (sdk) {
          debugLog('YaGames SDK initialized');
          sendLoadingReady();
        }

        return sdk;
      })
      .catch((err) => {
        debugLog('Error initializing YaGames SDK:', err);
        return null;
      });

    return ysdkPromise;
  }

  function sendLoadingReady() {
    if (loadingReadySent || !gameLoaded) return;

    initYsdk().then(() => {
      if (loadingReadySent) return;

      if (loadingApi?.ready) {
        loadingApi.ready();
        loadingReadySent = true;
        debugLog('LoadingAPI.ready() called');
      }
    });
  }

  function markGameLoaded() {
    gameLoaded = true;
    sendLoadingReady();
  }

  function startGameplay(reason) {
    initYsdk().then(() => {
      if (gameplayApi?.start) {
        gameplayApi.start();
        debugLog('GameplayAPI.start() called', reason);
      }
    });
  }

  function stopGameplay(reason) {
    initYsdk().then(() => {
      if (gameplayApi?.stop) {
        gameplayApi.stop();
        debugLog('GameplayAPI.stop() called', reason);
      }
    });
  }

  function showFullscreenAd() {
    return initYsdk().then(() => {
      if (adApi?.showFullscreenAdv) {
        debugLog('Showing fullscreen advertisement');
        return adApi.showFullscreenAdv({
          callbacks: {
            onClose: () => debugLog('Fullscreen ad closed'),
            onError: (err) => debugLog('Fullscreen ad error', err)
          }
        });
      }

      debugLog('Fullscreen ad API is unavailable');
      return Promise.resolve();
    });
  }

  function blockContextMenu() {
    window.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }

  // Detect if running in Android WebView
  function isAndroidWebView() {
    const ua = navigator.userAgent.toLowerCase();
    const isWebView = ua.indexOf('wv') > -1 || ua.indexOf('android') > -1;
    debugLog('isAndroidWebView:', isWebView);
    return isWebView;
  }

  // Safe storage wrapper
  const safeStorage = {
    getItem: function(storage, key) {
      try {
        return storage.getItem(key);
      } catch (e) {
        debugLog('Storage getItem error:', e.message);
        return null;
      }
    },
    setItem: function(storage, key, value) {
      try {
        storage.setItem(key, value);
        return true;
      } catch (e) {
        debugLog('Storage setItem error:', e.message);
        return false;
      }
    },
    removeItem: function(storage, key) {
      try {
        storage.removeItem(key);
        return true;
      } catch (e) {
        debugLog('Storage removeItem error:', e.message);
        return false;
      }
    }
  };

  // Reset navigation to home page for WebView on first load
  function resetNavigationForWebView() {
    if (!isAndroidWebView()) return;

    debugLog('resetNavigationForWebView called');

    // Clear any saved routing state on every WebView load
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('route') || key.includes('path') || key.includes('location'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => safeStorage.removeItem(localStorage, key));
      debugLog('Cleared routing keys:', keysToRemove.length);
    } catch (e) {
      debugLog('Could not clear localStorage:', e.message);
    }

    // Force navigation to root if not already there (without reload)
    if (window.location.pathname !== '/' && window.location.pathname !== '' && window.location.hash !== '#/') {
      debugLog('Redirecting to root from:', window.location.pathname);
      window.history.replaceState(null, '', '/');
    }
  }

  function injectHidingStyles() {
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      nav._8578b a[href="/kodedager"],
      nav._8578b button._54d8a,
      nav._8578b button._6ba2f,
      ._30648,
      .fe408,
      svg._08ab7,
      svg._08ab7 * {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function injectLogoStyles() {
    if (document.getElementById(logoStyleId)) return;

    const style = document.createElement('style');
    style.id = logoStyleId;
    style.textContent = `
      #${logoContainerId} {
        display: none !important;
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        pointer-events: none;
      }

      #${logoContainerId} img {
        display: block;
        max-width: 200px;
        height: auto;
      }

      @media screen and (min-width: 600px) {
        #${logoContainerId} img {
          max-width: 300px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function injectMobileButtonStyles() {
    if (document.getElementById(mobileButtonStyleId)) return;

    const style = document.createElement('style');
    style.id = mobileButtonStyleId;
    style.textContent = `
      /* Center "Выбрать уровень" button on all devices */
      .be2f2 {
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
      }

      /* Adjust note button for all devices */
      ._400b2 {
        bottom: 35px !important;
      }

      /* Fine tune button positions for landscape orientation */
      @media screen and (orientation: landscape) {
        .be2f2 {
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
        }

        ._400b2 {
          bottom: 28px !important;
        }
      }

      /* Move navigation links down by 30% */
      nav._8578b a[href="/brett"],
      nav._8578b a[href="/"] {
        transform: translateY(30vh) !important;
      }

      /* Move help button down by 30% */
      .c5c2b._19a74 {
        transform: translateY(30vh) !important;
      }
    `;

    document.head.appendChild(style);
  }

  function injectLogo() {
    if (document.getElementById(logoContainerId)) return;

    const logoContainer = document.createElement('div');
    logoContainer.id = logoContainerId;
    logoContainer.style.display = 'none';
    logoContainer.style.opacity = '0';

    const logoImg = document.createElement('img');
    // Use a relative path so the logo resolves in file-based contexts (e.g. Android WebView)
    logoImg.src = 'logo.png';
    logoImg.alt = 'Logo';

    logoContainer.appendChild(logoImg);
    document.body.appendChild(logoContainer);
  }

  function setupLogoHiding() {
    const logoContainer = document.getElementById(logoContainerId);
    if (!logoContainer) return;

    let isVisible = false;

    const hideLogo = () => {
      if (!isVisible) return;

      isVisible = false;
      logoContainer.style.transition = 'opacity 0.5s ease-out';
      logoContainer.style.opacity = '0';
      setTimeout(() => {
        if (!isVisible) {
          logoContainer.style.display = 'none';
        }
      }, 500);
    };

    const showLogo = () => {
      if (isVisible) return;

      isVisible = true;
      logoContainer.style.display = 'block';
      requestAnimationFrame(() => {
        logoContainer.style.transition = 'opacity 0.3s ease-in';
        logoContainer.style.opacity = '1';
      });
    };

    const startScreenVisible = () => Boolean(document.querySelector('div._541cc'));

    const syncLogo = () => {
      if (startScreenVisible()) {
        showLogo();
      } else {
        hideLogo();
      }
    };

    const observer = new MutationObserver(syncLogo);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    syncLogo();
  }

  let mobileLogoObserver;

  const mobileQuery = window.matchMedia('(max-width: 599px)');
  const landscapeQuery = window.matchMedia('(orientation: landscape)');

  function isMobile() {
    return mobileQuery.matches;
  }

  function isLandscape() {
    return landscapeQuery.matches;
  }

  function isMobileLandscape() {
    return isMobile() && isLandscape();
  }

  function teardownDesktopLogo() {
    const logoContainer = document.getElementById(logoContainerId);
    if (logoContainer) {
      logoContainer.remove();
    }

    const logoStyle = document.getElementById(logoStyleId);
    if (logoStyle) {
      logoStyle.remove();
    }
  }

  function stopMobileLogoReplacement() {
    if (mobileLogoObserver) {
      mobileLogoObserver.disconnect();
      mobileLogoObserver = null;
    }
  }

  function setupMobileLogoReplacement() {
    if (mobileLogoObserver) return;

    const replaceLogo = () => {
      const svgLogo = document.querySelector('svg._0af90');
      if (!svgLogo || svgLogo.dataset.robocotLogoReplaced === 'true') return;

      const img = document.createElement('img');
      // Use a relative path so the logo resolves in file-based contexts (e.g. Android WebView)
      img.src = 'logo.png';
      img.alt = 'Logo';
      img.dataset.robocotLogoReplaced = 'true';

      if (svgLogo.getAttribute('width')) {
        const width = svgLogo.getAttribute('width');
        img.style.width = width.endsWith('px') ? width : `${width}px`;
      }

      if (svgLogo.getAttribute('height')) {
        const height = svgLogo.getAttribute('height');
        img.style.height = height.endsWith('px') ? height : `${height}px`;
      }

      img.className = svgLogo.getAttribute('class') || '';
      svgLogo.replaceWith(img);
    };

    mobileLogoObserver = new MutationObserver(replaceLogo);
    mobileLogoObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    replaceLogo();
  }

  function hideAddBoardButton(root = document) {
    const button = Array.from(root.querySelectorAll('button, a')).find(
      (el) => el.textContent.trim() === 'Legg til brett'
    );

    if (button) {
      button.style.display = 'none';
      button.dataset.robocotHidden = 'true';
    }
  }

  function hideCodeInput(root = document) {
    const input = root.querySelector('input[name="codeInput"]');

    if (input) {
      input.style.display = 'none';
      input.dataset.robocotHidden = 'true';
    }
  }

  function clearCodePlaceholder(root = document) {
    const input = root.querySelector('input[placeholder="Kode f.eks 6AXP"]');

    if (input) {
      input.placeholder = '';
      input.dataset.robocotPlaceholderCleared = 'true';
    }
  }

  function setupLevelSelectionTweaks() {
    const applyTweaks = () => {
      hideAddBoardButton();
      hideCodeInput();
      clearCodePlaceholder();
    };

    const observer = new MutationObserver(applyTweaks);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    applyTweaks();
  }

  function applyResponsiveLogoBehavior() {
    if (isMobileLandscape()) {
      // Mobile landscape: replace SVG logo with IMG
      teardownDesktopLogo();
      setupMobileLogoReplacement();
    } else {
      // All other modes: show fixed logo container
      stopMobileLogoReplacement();
      injectLogoStyles();
      injectLogo();
      setupLogoHiding();
    }
  }

  // Enable WebView video support
  function enableWebViewVideoSupport() {
    if (!isAndroidWebView()) return;

    // Wait for videos to be added to the DOM
    const observer = new MutationObserver(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (video.dataset.robocotVideoFixed === 'true') return;

        // Add attributes for WebView compatibility
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.muted = true;

        // Force load and play
        video.load();
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.warn('Video autoplay failed:', e);
          });
        }

        video.dataset.robocotVideoFixed = 'true';
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also fix any existing videos
    setTimeout(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.muted = true;
        video.load();
        video.play().catch(e => console.warn('Video play failed:', e));
      });
    }, 1000);
  }

  function elementMatchesText(element, text) {
    return element && element.textContent && element.textContent.trim() === text;
  }

  function setupStartButtonHandler() {
    document.addEventListener('click', (event) => {
      const target = event.target;

      const startButton = target.closest('button');
      if (startButton && elementMatchesText(startButton, 'Начать игру')) {
        startGameplay('start-button');
        return;
      }

      if (target.closest('button._4e75b')) {
        showFullscreenAd()
          .catch(() => {})
          .finally(() => startGameplay('next-button'));
        return;
      }

      if (target.closest('button.db317')) {
        startGameplay('play-again-button');
        return;
      }

      if (target.closest('button._29fe1') || target.closest('div._42bf8')) {
        startGameplay('tutorial-close');
      }
    });
  }

  function setupTrainingModalObserver() {
    let tutorialVisible = false;

    const syncTutorialState = () => {
      const visible = Boolean(document.querySelector('div._2f84c'));

      if (visible && !tutorialVisible) {
        tutorialVisible = true;
        stopGameplay('tutorial-open');
      } else if (!visible && tutorialVisible) {
        tutorialVisible = false;
      }
    };

    const observer = new MutationObserver(syncTutorialState);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    syncTutorialState();
  }

  function setupInterlevelObserver() {
    let interlevelVisible = false;

    const syncInterlevelState = () => {
      const visible = Boolean(document.querySelector('button._4e75b'));

      if (visible && !interlevelVisible) {
        interlevelVisible = true;
        stopGameplay('interlevel');
      } else if (!visible && interlevelVisible) {
        interlevelVisible = false;
      }
    };

    const observer = new MutationObserver(syncInterlevelState);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    syncInterlevelState();
  }

  function init() {
    debugLog('Initializing Robocot customizations');
    debugLog('Document ready state:', document.readyState);
    debugLog('Root element exists:', !!document.getElementById('root'));
    debugLog('User Agent:', navigator.userAgent);

    try {
      blockContextMenu();
      initYsdk();
      debugLog('YaGames SDK init triggered');
    } catch (e) {
      debugLog('Error triggering YaGames SDK init:', e.message);
    }

    try {
      resetNavigationForWebView();
      debugLog('resetNavigationForWebView completed');
    } catch (e) {
      debugLog('Error in resetNavigationForWebView:', e.message);
    }

    try {
      injectHidingStyles();
      debugLog('injectHidingStyles completed');
    } catch (e) {
      debugLog('Error in injectHidingStyles:', e.message);
    }

    try {
      injectMobileButtonStyles();
      debugLog('injectMobileButtonStyles completed');
    } catch (e) {
      debugLog('Error in injectMobileButtonStyles:', e.message);
    }

    try {
      setupLevelSelectionTweaks();
      debugLog('setupLevelSelectionTweaks completed');
    } catch (e) {
      debugLog('Error in setupLevelSelectionTweaks:', e.message);
    }

    try {
      applyResponsiveLogoBehavior();
      debugLog('applyResponsiveLogoBehavior completed');
    } catch (e) {
      debugLog('Error in applyResponsiveLogoBehavior:', e.message);
    }

    try {
      enableWebViewVideoSupport();
      debugLog('enableWebViewVideoSupport completed');
    } catch (e) {
      debugLog('Error in enableWebViewVideoSupport:', e.message);
    }

    try {
      setupStartButtonHandler();
      debugLog('setupStartButtonHandler completed');
    } catch (e) {
      debugLog('Error in setupStartButtonHandler:', e.message);
    }

    try {
      setupTrainingModalObserver();
      debugLog('setupTrainingModalObserver completed');
    } catch (e) {
      debugLog('Error in setupTrainingModalObserver:', e.message);
    }

    try {
      setupInterlevelObserver();
      debugLog('setupInterlevelObserver completed');
    } catch (e) {
      debugLog('Error in setupInterlevelObserver:', e.message);
    }

    try {
      if (document.readyState === 'complete') {
        markGameLoaded();
      } else {
        window.addEventListener('load', markGameLoaded, { once: true });
      }
      debugLog('load event listener for LoadingAPI.ready configured');
    } catch (e) {
      debugLog('Error configuring LoadingAPI ready trigger:', e.message);
    }

    mobileQuery.addEventListener('change', applyResponsiveLogoBehavior);
    landscapeQuery.addEventListener('change', applyResponsiveLogoBehavior);

    debugLog('Initialization complete');
  }

  debugLog('Script loaded, waiting for DOM');

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    debugLog('DOM already ready, initializing immediately');
    init();
  } else {
    debugLog('Waiting for DOMContentLoaded event');
    document.addEventListener('DOMContentLoaded', function() {
      debugLog('DOMContentLoaded fired');
      init();
    }, { once: true });
  }
})();
