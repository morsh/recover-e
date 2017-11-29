(function (window, document, localStorage) {
  
    const MAX_CACHE_SESSIONS = 8;

    let cache = {
      sessions: {}
    };
    let currentSessionId = (new Date()).toISOString();
    let currentSession = { };
    let inputId = 1;
  
    function log(msg) {
      console.log('Recover-E: ' + msg);
    }

    /**
     * ======================================
     * Initialization and cache management
     * ======================================
     */
  
    function injectCSS() {
      let css = `
      
        .rcve-menu { 
          display: none; 
          position: absolute; 
          z-index: 999999;
        }
  
        .rcve-menu-button {
          -webkit-box-sizing: content-box;
          -moz-box-sizing: content-box;
          box-sizing: content-box;
          width: 0; 
          height: 15px; 
          border: 7px solid #1abc9c;
          border-top: 0 solid;
          border-bottom: 4px solid rgba(0,0,0,0);
          font: normal 100%/normal Arial, Helvetica, sans-serif;
          color: rgba(0,0,0,1);
          -o-text-overflow: clip;
          text-overflow: clip;
          display: inline-block;
          color: white;
          cursor: pointer;
          opacity: 0.75;
        }
        
        .rcve-menu-content {
          display: none;
          position: absolute;
          right: 0;
          background-color: #f9f9f9;
          min-width: 160px;
          box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
          z-index: 1;
        }
        
        .rcve-menu-content a {
          color: black;
          padding: 6px 16px;
          text-decoration: none;
          display: block;
        }
        
        .rcve-menu-content a:hover { background-color: #f1f1f1; }
        
        .rcve-menu:hover .rcve-menu-content {
          display: block;
        }
        
        .rcve-menu:hover .rcve-menu-button {
          border: 7px solid #3e8e41;
          border-top: 0 solid;
          border-bottom: 4px solid rgba(0,0,0,0);
          opacity: 1;
        }
  
      `;
      let head = document.head || document.getElementsByTagName('head')[0];
      let style = document.createElement('style');
  
      style.type = 'text/css';
      if (style.styleSheet){
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
  
      head.appendChild(style);
    }
    injectCSS();
  
    function loadLocalStorage() {
      let cacheString = localStorage.getItem('recover-e-cache');
      if (cacheString) {
        cache = JSON.parse(cacheString);
      }

      let sessionsIds = Object.keys(cache.sessions);
      for (let i = 0; i <= sessionsIds.length - MAX_CACHE_SESSIONS - 1; i++) {
        delete cache.sessions[sessionsIds[i]];
      }

      cache.sessions[currentSessionId] = currentSession;
  
      log('Loaded sessions - ' + Object.keys(cache.sessions).join(', '));
    }
    loadLocalStorage();
  
    function saveLocalStorage() {
      localStorage.setItem('recover-e-cache', JSON.stringify(cache));
    }

    /**
     * ======================================
     * Elements values monitoring
     * ======================================
     */
    
    function inputValueChanged (evt) {
      log(this.id + ' has a new value ' + this.value);
      if (this.id) {
        currentSession[this.id] = inputGetValue(this);
      } else {
        currentSession['--data-rcve-id-' + this.getAttribute('data-rcve-id')] = inputGetValue(this);
      }

      saveLocalStorage();
    }

    function htmlEscape(str) {

      // List of HTML entities for escaping.
      var htmlEscapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;' };

      // Regex containing the keys listed immediately above.
      var htmlEscaper = /[&<>"'\/]/g;

      // Escape a string for HTML interpolation.
      return ('' + str).replace(htmlEscaper, match => htmlEscapes[match]);
    }

    function getInput(id) {
      let input = document.getElementById(id);
      if (!input && id && id.startsWith('--data-rcve-id-')) {
        input = document.querySelector('input[data-rcve-id="' + id.split('--data-rcve-id-')[1] + '"]');
      }
      return input;
    }

    function fixMenuPosition() {
      let inputPosition = document.activeElement.getBoundingClientRect();
      let menu = document.getElementById('rcve-menu');
      menu.style.display = 'inline-block';
      menu.style.top = (inputPosition.top + 0) + 'px';
      menu.style.left = (inputPosition.left + inputPosition.width - 20) + 'px';
    }
  
    function inputOnFocusIn(evt) {
      log('focus event fired for ' + this.id);
      this.setAttribute('data-rcve-focus', 'true');
      let menuId = this.getAttribute('data-rcve-id');

      let menu = document.getElementById('rcve-menu');
      if (!menu) {
        document.body.insertAdjacentHTML('beforeend', `
          <div id="rcve-menu" class="rcve-menu">
            <span class="rcve-menu-button">*</span>
            <div class="rcve-menu-content">
              <a href="#">Link 1</a>
              <a href="#">Link 2</a>
              <a href="#">Link 3</a>
            </div>
          </div> 
        `);

        menu = document.getElementById('rcve-menu');
        menu.addEventListener('mouseover', () => menu.setAttribute('data-rcve-focus', 'true'));
        menu.addEventListener('mouseout', () => {
          menu.setAttribute('data-rcve-focus', 'false');
          for (let i in currentSession) {
            let input = getInput(i);
            if (input.hasAttribute('data-rcve-user')) {
              input.value = input.getAttribute('data-rcve-user') || '';
              input.removeAttribute('data-rcve-user');
            }
          }
        });

        document.querySelector('#rcve-menu .rcve-menu-content').addEventListener('mouseover', (evt) => {
          if (evt.target.tagName === 'A') {
            let session = evt.target.getAttribute('data-rcve-session');

            Object.keys(cache.sessions[session]).forEach(objectKey => {

              let input = getInput(objectKey);
              if (objectKey !== input.id && cache.sessions[session][input.id]) {
                delete cache.sessions[session][objectKey];
                return;
              }

              // Check user value
              if (!input.hasAttribute('data-rcve-user')) {
                input.setAttribute('data-rcve-user', inputGetValue(input));
              }

              if (session === currentSessionId) {
                inputSetValue(input, input.getAttribute('data-rcve-user') || '');
              } else {
                inputSetValue(input, cache.sessions[session][objectKey] + '');
                currentSession[objectKey] = cache.sessions[session][objectKey];
              }
            });
          }
        }, true);

        document.querySelector('#rcve-menu .rcve-menu-content').addEventListener('click', (evt) => {
          if (evt.target.tagName === 'A') {
            for (let i in currentSession) {
              let input = getInput(i);
              input.removeAttribute('data-rcve-user');
            }
          }
        }, true);

        setInterval(() => {
          // Check if theres an active element
          if (!document.activeElement || !document.activeElement.hasAttribute('data-rcve')) {
            menu.style.display = 'none';
          }

          if (document.activeElement && document.activeElement.hasAttribute('data-rcve')) {
            fixMenuPosition();
          }
        }, 1000);

        window.addEventListener('scroll', fixMenuPosition, true);
        window.addEventListener('resize', fixMenuPosition, true);
      }

      let content = menu.querySelector('.rcve-menu-content');
      content.innerHTML = "";
      let firstSession = null;
      for (let sessionId in cache.sessions) {
        if (sessionId != currentSessionId) {
          firstSession = firstSession || sessionId;
          let rawValue = cache.sessions[sessionId][this.id] || '';
          let value = htmlEscape(rawValue);
          content.innerHTML = `
            <a href="#" data-rcve-id="${menuId}" data-rcve-value="${ value || ''}" data-rcve-session="${sessionId}">
              ${ (value && (value.length > 20 ? htmlEscape(rawValue.substr(0, 20)) + '...' : value)) || '&lt;empty&gt;'}
            </a>
          ` + content.innerHTML;
        }
      }

      if (!content.innerHTML) {
        content.innerHTML += '<a href="#" data-rcve-id="-1">&lt;No data found&gt;</a>';
      } else {
        content.innerHTML = `<a href="#" data-rcve-id="${menuId}" data-rcve-value="" data-rcve-session="${currentSessionId}">&lt;None&gt;</a>` + content.innerHTML;
      }

      fixMenuPosition();
    }
  
    function inputOnFocusOut(evt) {
      log('focus out event fired for ' + this.id);
      this.setAttribute('data-rcve-focus', 'false');
    }
  
    function protectInput(input) {
      log('found new input <' + input.id + '>');
      let currentInputId = inputId++;
      input.setAttribute('data-rcve', 'true');
      input.setAttribute('data-rcve-id', currentInputId);

      currentSession[input.id || '--data-rcve-id-' + currentInputId] = '';
  
      input.addEventListener('input', inputValueChanged.bind(input));
      input.addEventListener('focus', inputOnFocusIn.bind(input));
      input.addEventListener('blur', inputOnFocusOut.bind(input));
    }
  
    function protectAllInputs() {
      log('protecting all inputs...');
      let inputs = document.querySelectorAll('input, textarea');
      
      for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i];
        if (inputShouldProtect(input)) {
            protectInput(input);
        }
      }
    }

    function inputShouldProtect(ctrl) {
      return !ctrl.hasAttribute('data-rcve') && (
        (
            ctrl.tagName === 'INPUT' &&
            (ctrl.type === 'text' /*|| ctrl.type == 'radio' || ctrl.type == 'checkbox'*/) &&
            ctrl.getAttribute('readonly') !== 'true'
        ) || (
          ctrl.tagName === 'TEXTAREA' &&
          ctrl.getAttribute('readonly') !== 'true'
        )
      );
    }

    function inputGetValue(ctrl) {
      return (
        /*(
          (ctrl.tagName === 'INPUT' && (ctrl.type == 'radio' || ctrl.type == 'checkbox')) && ctrl.checked
        ) ||*/ (
          ((ctrl.tagName === 'INPUT' && ctrl.type == 'text') || ctrl.tagName === 'TEXTAREA') && ctrl.value
        )
      );
    }

    function inputSetValue(ctrl, value) {
      if (ctrl.tagName === 'INPUT' && (ctrl.type == 'radio' || ctrl.type == 'checkbox')) {
        ctrl.checked = value;
      } else if ((ctrl.tagName === 'INPUT' && ctrl.type === 'text') || ctrl.tagName === 'TEXTAREA') {
        ctrl.value = value;
      }
    }
  
    function observePage() {
      // create an observer instance
      let observer = new MutationObserver(protectAllInputs);
  
      // pass in the target node, as well as the observer options
      observer.observe(document.body, { attributes: true, childList: true });
  
      protectAllInputs();
      log('observing mutations...');
    }
    observePage();
  
  })(window, document, localStorage);
  