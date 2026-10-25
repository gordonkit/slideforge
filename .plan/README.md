# .plan

分段執行的工作計畫與進度紀錄。每個計畫一個資料夾：

| 計畫 | 狀態 | 說明 |
| --- | --- | --- |
| [layout-registry-templates](layout-registry-templates/plan.md) | 進行中 | Layout registry、`family/variant` 命名、template（版型包） |

## 使用方式

- `plan.md`：目標、設計決策、各階段的範圍與驗收條件。設計變更時更新並在進度紀錄註明。
- `progress.md`：每階段完成時追加一筆紀錄（日期、實際執行的檢查與結果、偏離計畫之處、下一步）。
- 每階段完成後，程式碼、文件與 `progress.md` 一起 commit；commit 訊息以 `[Stage N]` 開頭。
- 中斷後要接續時，先讀 `progress.md` 最後一筆，再讀 `plan.md` 對應階段。
- 合併回 `main` 前決定 `.plan/` 要保留在 repo 還是移除。
