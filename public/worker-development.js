/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./worker/index.ts":
/*!*************************!*\
  !*** ./worker/index.ts ***!
  \*************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("// worker/index.ts\n// --- [추가] 푸시 알림을 수신하고 표시하는 코드 ---\nself.addEventListener(\"push\", (event)=>{\n    console.log(\"[Service Worker] Push Received.\");\n    console.log('[Service Worker] Push had this data: \"'.concat(event.data.text(), '\"'));\n    // 서버에서 받은 데이터를 파싱합니다.\n    const pushData = event.data.json();\n    const title = pushData.title || \"새로운 알림\";\n    const options = {\n        body: pushData.body || \"알림 내용이 없습니다.\",\n        icon: \"/icons/icon-192x192.png\",\n        badge: \"/favicon.ico.png\",\n        data: {\n            url: pushData.url || \"/\" // 알림 클릭 시 이동할 URL\n        }\n    };\n    // 알림을 표시하기 전까지 서비스 워커가 활성 상태를 유지하도록 합니다.\n    event.waitUntil(self.registration.showNotification(title, options));\n});\n// --- [추가] 알림을 클릭했을 때의 동작을 정의하는 코드 ---\nself.addEventListener(\"notificationclick\", (event)=>{\n    console.log(\"[Service Worker] Notification click Received.\");\n    event.notification.close(); // 알림 창을 닫습니다.\n    const urlToOpen = event.notification.data.url || \"/\";\n    // 알림에 설정된 URL로 새 창이나 탭을 엽니다.\n    event.waitUntil(clients.openWindow(urlToOpen));\n});\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi93b3JrZXIvaW5kZXgudHMiLCJtYXBwaW5ncyI6IkFBQUEsa0JBQWtCO0FBRWxCLG1DQUFtQztBQUNuQ0EsS0FBS0MsZ0JBQWdCLENBQUMsUUFBUUMsQ0FBQUE7SUFDNUJDLFFBQVFDLEdBQUcsQ0FBQztJQUNaRCxRQUFRQyxHQUFHLENBQUMseUNBQTJELE9BQWxCRixNQUFNRyxJQUFJLENBQUNDLElBQUksSUFBRztJQUV2RSxzQkFBc0I7SUFDdEIsTUFBTUMsV0FBV0wsTUFBTUcsSUFBSSxDQUFDRyxJQUFJO0lBRWhDLE1BQU1DLFFBQVFGLFNBQVNFLEtBQUssSUFBSTtJQUNoQyxNQUFNQyxVQUFVO1FBQ2RDLE1BQU1KLFNBQVNJLElBQUksSUFBSTtRQUN2QkMsTUFBTTtRQUNOQyxPQUFPO1FBQ1BSLE1BQU07WUFDSlMsS0FBS1AsU0FBU08sR0FBRyxJQUFJLElBQUksa0JBQWtCO1FBQzdDO0lBQ0Y7SUFFQSx5Q0FBeUM7SUFDekNaLE1BQU1hLFNBQVMsQ0FBQ2YsS0FBS2dCLFlBQVksQ0FBQ0MsZ0JBQWdCLENBQUNSLE9BQU9DO0FBQzVEO0FBRUEsdUNBQXVDO0FBQ3ZDVixLQUFLQyxnQkFBZ0IsQ0FBQyxxQkFBcUJDLENBQUFBO0lBQ3pDQyxRQUFRQyxHQUFHLENBQUM7SUFFWkYsTUFBTWdCLFlBQVksQ0FBQ0MsS0FBSyxJQUFJLGNBQWM7SUFFMUMsTUFBTUMsWUFBWWxCLE1BQU1nQixZQUFZLENBQUNiLElBQUksQ0FBQ1MsR0FBRyxJQUFJO0lBRWpELDZCQUE2QjtJQUM3QlosTUFBTWEsU0FBUyxDQUNiTSxRQUFRQyxVQUFVLENBQUNGO0FBRXZCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL3dvcmtlci9pbmRleC50cz9lY2JlIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIHdvcmtlci9pbmRleC50c1xuXG4vLyAtLS0gW+y2lOqwgF0g7ZG47IucIOyVjOumvOydhCDsiJjsi6DtlZjqs6Ag7ZGc7Iuc7ZWY64qUIOy9lOuTnCAtLS1cbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcigncHVzaCcsIGV2ZW50ID0+IHtcbiAgY29uc29sZS5sb2coJ1tTZXJ2aWNlIFdvcmtlcl0gUHVzaCBSZWNlaXZlZC4nKTtcbiAgY29uc29sZS5sb2coYFtTZXJ2aWNlIFdvcmtlcl0gUHVzaCBoYWQgdGhpcyBkYXRhOiBcIiR7ZXZlbnQuZGF0YS50ZXh0KCl9XCJgKTtcblxuICAvLyDshJzrsoTsl5DshJwg67Cb7J2AIOuNsOydtO2EsOulvCDtjIzsi7Htlanri4jri6QuXG4gIGNvbnN0IHB1c2hEYXRhID0gZXZlbnQuZGF0YS5qc29uKCk7XG5cbiAgY29uc3QgdGl0bGUgPSBwdXNoRGF0YS50aXRsZSB8fCAn7IOI66Gc7Jq0IOyVjOumvCc7XG4gIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgYm9keTogcHVzaERhdGEuYm9keSB8fCAn7JWM66a8IOuCtOyaqeydtCDsl4bsirXri4jri6QuJyxcbiAgICBpY29uOiAnL2ljb25zL2ljb24tMTkyeDE5Mi5wbmcnLCAvLyDslYzrprwg7JWE7J207L2YIOqyveuhnFxuICAgIGJhZGdlOiAnL2Zhdmljb24uaWNvLnBuZycsIC8vIOyViOuTnOuhnOydtOuTnOyXkOyEnCDtkZzsi5zrkKAg7J6R7J2AIOyVhOydtOy9mFxuICAgIGRhdGE6IHtcbiAgICAgIHVybDogcHVzaERhdGEudXJsIHx8ICcvJyAvLyDslYzrprwg7YG066atIOyLnCDsnbTrj5ntlaAgVVJMXG4gICAgfVxuICB9O1xuXG4gIC8vIOyVjOumvOydhCDtkZzsi5ztlZjquLAg7KCE6rmM7KeAIOyEnOu5hOyKpCDsm4zsu6TqsIAg7Zmc7ISxIOyDge2DnOulvCDsnKDsp4DtlZjrj4TroZ0g7ZWp64uI64ukLlxuICBldmVudC53YWl0VW50aWwoc2VsZi5yZWdpc3RyYXRpb24uc2hvd05vdGlmaWNhdGlvbih0aXRsZSwgb3B0aW9ucykpO1xufSk7XG5cbi8vIC0tLSBb7LaU6rCAXSDslYzrprzsnYQg7YG066at7ZaI7J2EIOuVjOydmCDrj5nsnpHsnYQg7KCV7J2Y7ZWY64qUIOy9lOuTnCAtLS1cbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbm90aWZpY2F0aW9uY2xpY2snLCBldmVudCA9PiB7XG4gIGNvbnNvbGUubG9nKCdbU2VydmljZSBXb3JrZXJdIE5vdGlmaWNhdGlvbiBjbGljayBSZWNlaXZlZC4nKTtcbiAgXG4gIGV2ZW50Lm5vdGlmaWNhdGlvbi5jbG9zZSgpOyAvLyDslYzrprwg7LC97J2EIOuLq+yKteuLiOuLpC5cblxuICBjb25zdCB1cmxUb09wZW4gPSBldmVudC5ub3RpZmljYXRpb24uZGF0YS51cmwgfHwgJy8nO1xuICBcbiAgLy8g7JWM66a87JeQIOyEpOygleuQnCBVUkzroZwg7IOIIOywveydtOuCmCDtg63snYQg7Je964uI64ukLlxuICBldmVudC53YWl0VW50aWwoXG4gICAgY2xpZW50cy5vcGVuV2luZG93KHVybFRvT3BlbilcbiAgKTtcbn0pOyJdLCJuYW1lcyI6WyJzZWxmIiwiYWRkRXZlbnRMaXN0ZW5lciIsImV2ZW50IiwiY29uc29sZSIsImxvZyIsImRhdGEiLCJ0ZXh0IiwicHVzaERhdGEiLCJqc29uIiwidGl0bGUiLCJvcHRpb25zIiwiYm9keSIsImljb24iLCJiYWRnZSIsInVybCIsIndhaXRVbnRpbCIsInJlZ2lzdHJhdGlvbiIsInNob3dOb3RpZmljYXRpb24iLCJub3RpZmljYXRpb24iLCJjbG9zZSIsInVybFRvT3BlbiIsImNsaWVudHMiLCJvcGVuV2luZG93Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./worker/index.ts\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	!function() {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = function() {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: function(script) { return script; }
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	!function() {
/******/ 		__webpack_require__.ts = function(script) { return __webpack_require__.tt().createScript(script); };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	!function() {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push(function(options) {
/******/ 			var originalFactory = options.factory;
/******/ 			options.factory = function(moduleObject, moduleExports, webpackRequire) {
/******/ 				var hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				var cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : function() {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./worker/index.ts");
/******/ 	
/******/ })()
;