@echo off
chcp 65001 >nul
title CrewPlay GoDaddy DNS 設定指南
echo.
echo ========================================
echo   CrewPlay 網域綁定（GoDaddy + Netlify）
echo   正式網址: https://www.crewplay.tw
echo ========================================
echo.
echo 【第一步】Netlify 後台（crewplay 專案）
echo   Domain management ^> Add a domain
echo   依序加入:
echo     - crewplay.tw
echo     - www.crewplay.tw
echo     - crew-play.com
echo     - www.crew-play.com
echo.
echo 【第二步】GoDaddy ^> crewplay.tw ^> DNS
echo.
echo   記錄 1（www 子網域）:
echo     類型: CNAME
echo     名稱: www
echo     值:   crewplay.netlify.app
echo     TTL:  1 小時（或預設）
echo.
echo   記錄 2（裸網域 crewplay.tw，擇一）:
echo     方式 A - A 記錄:
echo       類型: A
echo       名稱: @
echo       值:   75.2.60.5
echo     方式 B - 若 GoDaddy 不支援 apex CNAME，用轉址:
echo       網域設定 ^> 轉址 ^> crewplay.tw 轉到 https://www.crewplay.tw
echo.
echo 【第三步】GoDaddy ^> crew-play.com ^> DNS
echo.
echo   記錄 1:
echo     類型: CNAME
echo     名稱: www
echo     值:   crewplay.netlify.app
echo   記錄 2:
echo     類型: A
echo     名稱: @
echo     值:   75.2.60.5
echo   （或 @ 轉址到 https://www.crewplay.tw）
echo.
echo 【第四步】Netlify 環境變數（Site configuration）
echo   NEXT_PUBLIC_SITE_URL=https://www.crewplay.tw
echo   AUTH_DEV_OTP=true
echo   （三竹、綠界之後再補）
echo.
echo   儲存後: Deploys ^> Trigger deploy ^> Clear cache and deploy
echo.
echo 【第五步】等待 DNS 生效（通常 10 分鐘～48 小時）
echo   測試: https://www.crewplay.tw
echo.
echo staghornfrenart.com 為另一專案，請勿改 DNS（除非你要換站）
echo.
pause
