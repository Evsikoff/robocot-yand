(function () {
  const styleId = 'robocot-cleanup-style';
  const logoStyleId = 'robocot-logo-style';
  const logoContainerId = 'robocot-logo-container';

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

  function injectLogo() {
    if (document.getElementById(logoContainerId)) return;

    const logoContainer = document.createElement('div');
    logoContainer.id = logoContainerId;

    const logoImg = document.createElement('img');
    logoImg.src = '/logo.png';
    logoImg.alt = 'Logo';

    logoContainer.appendChild(logoImg);
    document.body.appendChild(logoContainer);
  }

  function setupLogoHiding() {
    const logoContainer = document.getElementById(logoContainerId);
    if (!logoContainer) return;

    let gameStarted = false;

    // Отслеживаем клики по всему документу
    document.addEventListener('click', function(event) {
      const target = event.target;

      // Проверяем, был ли клик по кнопке или ссылке, которая может запустить игру
      if (target.tagName === 'BUTTON' || target.tagName === 'A' ||
          target.closest('button') || target.closest('a')) {

        // Проверяем текст элемента на наличие слов, связанных со стартом игры
        const text = target.textContent || '';
        const isStartButton = /начать|start|играть|play|старт/i.test(text);

        if (isStartButton) {
          gameStarted = true;
          // Скрываем логотип с плавной анимацией
          logoContainer.style.transition = 'opacity 0.5s ease-out';
          logoContainer.style.opacity = '0';
          setTimeout(() => {
            logoContainer.style.display = 'none';
          }, 500);
        }
      }
    });

    // Также отслеживаем изменения в DOM, но только после клика на кнопку старта
    const observer = new MutationObserver(function(mutations) {
      // Проверяем только если игра уже начата
      if (!gameStarted) return;

      // Проверяем, не появилось ли игровое поле
      const hasGameElements = document.querySelector('canvas, [class*="game"], [class*="level"], [class*="board"]');

      if (hasGameElements && logoContainer.style.display !== 'none') {
        logoContainer.style.transition = 'opacity 0.5s ease-out';
        logoContainer.style.opacity = '0';
        setTimeout(() => {
          logoContainer.style.display = 'none';
        }, 500);
        observer.disconnect();
      }
    });

    // Начинаем наблюдение за изменениями в body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    injectHidingStyles();
    injectLogoStyles();
    injectLogo();
    setupLogoHiding();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }
})();
