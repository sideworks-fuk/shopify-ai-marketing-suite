デプロイエラーの確認

Skip to content
Navigation Menu
sideworks-fuk
shopify-ai-marketing-suite

Type / to search
Code
Issues
Pull requests
Actions
Projects
Security
Insights
Settings
Frontend Deploy
Frontend Deploy #124
Jobs
Run details
build-and-deploy
failed now in 1m 44s
Search logs
1s
18s
10s
0s
0s
1m 11s
    at Zc (/github/workspace/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:71:145)

Error occurred prerendering page "/sync/SyncRangeManagementDemo". Read more: https://nextjs.org/docs/messages/prerender-error

MissingAppProviderError: No i18n was provided. Your application must be wrapped in an <AppProvider> component. See https://polaris.shopify.com/components/app-provider for implementation instructions.
    at Object.useI18n (/github/workspace/node_modules/@shopify/polaris/build/cjs/utilities/i18n/hooks.js:10:11)
    at Header (/github/workspace/node_modules/@shopify/polaris/build/cjs/components/Page/components/Header/Header.js:41:22)
    at Wc (/github/workspace/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:68:44)
    at Zc (/github/workspace/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:70:253)
    at Z (/github/workspace/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:76:89)
    at $c (/github/workspace/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:78:98)
    at bd (/github/workspace/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:77:404)
    at Z (/github/workspace/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:76:217)
    at $c (/github/workspace/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:78:98)
    at Zc (/github/workspace/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js:71:145)
 ⚠ metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000". See https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
   Generating static pages (14/57) 
   Generating static pages (28/57) 
   Generating static pages (42/57) 
🔍 Using NEXT_PUBLIC_ENVIRONMENT: development
🔍 Using build time environment: development
✅ Environment configuration validated: development -> https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
🔗 YearOverYearApiClient initialized with baseUrl: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
🔍 Using NEXT_PUBLIC_ENVIRONMENT: development
🔍 Using build time environment: development
✅ Environment configuration validated: development -> https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
🔗 YearOverYearApiClient initialized with baseUrl: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
 ✓ Generating static pages (57/57)

> Export encountered errors on following paths:
	/sync/SyncRangeManagementDemo
npm error Lifecycle script `build` failed with error:
npm error code 1
npm error path /github/workspace/frontend
npm error workspace ec-ranger-frontend@1.0.0
npm error location /github/workspace/frontend
npm error command failed
npm error command sh -c next build


---End of Oryx build logs---
Oryx has failed to build the solution.

For further information, please visit the Azure Static Web Apps documentation at https://docs.microsoft.com/en-us/azure/static-web-apps/
If you believe this behavior is unexpected, please raise a GitHub issue at https://github.com/azure/static-web-apps/issues/
Exiting
0s
0s
0s
0s
