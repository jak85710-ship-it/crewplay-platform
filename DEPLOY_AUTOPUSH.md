# 一鍵上架指令（Windows PowerShell）

## 最常用（完整上架）

```powershell
powershell -ExecutionPolicy Bypass -File .\auto-push.ps1 -Mode all -Message "chore: deploy"
```

## 只觸發部署（不帶檔案變更）

```powershell
powershell -ExecutionPolicy Bypass -File .\auto-push.ps1 -Mode deploy-only -Message "chore: trigger deploy"
```

## 只先 commit 不 push

```powershell
powershell -ExecutionPolicy Bypass -File .\auto-push.ps1 -Mode all -Message "feat: xxx" -SkipPush
```

## 檢查命令（不實際執行）

```powershell
powershell -ExecutionPolicy Bypass -File .\auto-push.ps1 -Mode all -Message "test" -DryRun
```

## 備註

- 腳本會自動在 repo 設定 `gc.auto=0`，避免 Windows/OneDrive 常見的互動式 GC 卡住。
- 腳本內建 push 重試（預設 2 次）。
- 如果 repo 在 OneDrive 路徑，建議上架時暫停 OneDrive 同步，完成後再恢復。

## Push 後自動部署（Netlify）

先在 PowerShell 設定你的 Build Hook（只要做一次）：

```powershell
setx NETLIFY_BUILD_HOOK_URL "https://api.netlify.com/build_hooks/你的hook"
```

重新開一個 PowerShell 後，照常跑上架指令即可。腳本會在 push 成功後自動呼叫 Build Hook。

如果你只想靠 Git 自動部署、不打 Hook，可加上：

```powershell
powershell -ExecutionPolicy Bypass -File .\auto-push.ps1 -Mode all -Message "chore: deploy" -SkipDeployHook
```
