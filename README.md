# GuessColor

出題された2〜3色をすべて含むポケモンの名前を入力する、1人用のタイムアタッククイズです。正解するほど残り時間が伸びます。

> 非公式のファンメイド作品です。任天堂・ゲームフリーク・ポケモン社とは関係ありません。画像は使用せず、名前のテキストのみを扱います。

🎮 **プレイはこちら**: https://mr2okama.github.io/GuessColor/

## ルール
- 初期時間30秒、正解で+3秒、パスは-1秒（コンボ切れ）
- 不正解にペナルティはありません
- コンボが続くと3色の問題が出ます

## 開発
```
npm install
npm run dev     # 開発サーバー
npm test        # テスト
npm run build   # ビルド
```

## データ
`src/data/pokemon.json` に `{ id, name, colors[] }` を追加します。色は 赤・青・黄・緑・黒・白・茶・ピンク・紫・灰・オレンジ から選びます。
現在のデータは動作確認用のサンプルです。

## 公開
`main` への push で GitHub Pages にデプロイされます（Settings > Pages > Source を GitHub Actions に設定）。