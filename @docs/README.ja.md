# LuguManus

[English](./README.en.md)
[繁體中文](./README.zh-TW.md)
[简体中文](../README.md)
[日本語](./README.ja.md)

LuguManusは、ElectronとTypeScriptを使用して構築されたインテリジェントなデスクトップアプリケーションフレームワークであり、先進的な大規模言語モデルと実用的なツールコンポーネントを深く統合し、強力な自動化および支援システムを作成します。

<img src="../docs/star.gif" alt="start" width="128" style="display: block; margin: 0 auto;" />

## 主な特徴

- **マルチエージェント協力メカニズム**：基本エージェント、対話エージェント、タスク指向エージェントの3層アーキテクチャを使用して、協力的な作業モードを通じて複雑な問題を解決します。
- **インテリジェントタスク分解**：複雑なタスクを自動的に複数の実行可能なサブタスクに分解し、順序または依存関係に従って実行します。
- **ツールチェーン統合**：ウェブ検索、ドキュメント処理、チャート生成、コード実行のための組み込みツールコンポーネント。
- **応答性のあるデータフロー**：RxJSに基づいた応答性のあるアーキテクチャで、スムーズな非同期メッセージ処理能力を提供します。
- **ブラウザシミュレーションインタラクション**：Electronを通じてブラウザの動作をシミュレートし、ウェブブラウジング、コンテンツ抽出、ウェブアクションの実行が可能です。
- **マルチモデルサポート**：異なるタイプのAIモデル（テキスト、長文、コード、画像認識など）をサポートします。

## 技術スタック

- Electronデスクトップアプリケーションフレームワーク
- TypeScript型安全性
- Prisma ORM + SQLiteデータ永続化
- RxJSリアクティブプログラミング
- OpenAI SDKモデル統合（Qwen）

## アプリケーションシナリオ

LuguManusは、AI支援を必要とするさまざまなデスクトップアプリケーションシナリオに適しており、以下に限定されません：

- インテリジェントドキュメント処理と分析
- 自動化されたネットワーク情報の取得と統合
- 複雑なタスクの計画と実行
- コード支援と実行
- ...

このフレームワークを継続的に改善しており、開発者が貢献し、より強力なAIデスクトップツールエコシステムを共に構築することを歓迎します。

## 目次

- [クイックスタート](#クイックスタート)
- [プロジェクト構造](#プロジェクト構造)
- [アーキテクチャ設計](#アーキテクチャ設計)
- [インストール設定](#インストール設定)
- [貢献ガイド](#貢献ガイド)
- [ライセンス](#ライセンス)
- [謝辞](#謝辞)
- [連絡先](#連絡先)

## クイックスタート

1. 依存関係をインストール

```bash
# プロジェクトをクローン
git clone https://github.com/electron-manus/lugumanus.git
cd lugumanus

# 依存関係をインストール
bun install

# パッケージをビルド
bun run build-deps

# レンダラープロセスを実行
bun nx run @lugu-manus/renderer:dev

# メインプロセスを実行
bun nx run @lugu-manus/main:dev
```

## プロジェクト構造

```bash
lugumanus/
├── apps/                       # アプリケーションディレクトリ
│   ├── main/                   # Electronメインプロセス
│   │   ├── src/                # メインプロセスのソースコード
│   │   │   ├── agent/          # エージェントシステム（基本エージェント、対話エージェント、タスクエージェント）
│   │   │   ├── model/          # モデル統合（チャット完了など）
│   │   │   ├── toolkits/       # ツールキットコレクション
│   │   │   │   ├── search-toolkit/      # 検索ツール統合
│   │   │   │   ├── chart-toolkit/       # チャート生成ツール
│   │   │   │   ├── document-toolkit/    # ドキュメント処理ツール（Markdown、Excel、PPT）
│   │   │   │   └── code-toolkit/        # コード実行ツール
│   │   │   ├── routers/        # tRPC APIルート
│   │   │   ├── studio-preload/ # スタジオプリロードスクリプト
│   │   │   ├── window.ts       # ウィンドウ管理
│   │   │   ├── main.ts         # メインプロセスエントリ
│   │   │   └── preload.ts      # プリロードスクリプト
│   │   ├── prisma/             # Prisma ORM関連
│   │   │   └── schema.prisma   # データベースモデル定義
│   │   └── scripts/            # ビルドスクリプト
│   └── renderer/               # レンダラープロセス（フロントエンドUI）
│       └── src/
│           └── components/     # Reactコンポーネント
│               └── studio/     # スタジオ関連コンポーネント
│
├── packages/                   # 再利用可能なモジュールパッケージ
│   ├── electron-browseruse/    # ブラウザ自動化ツール
│   │   ├── src/                # ブラウザツールのソースコード
│   │   └── README.md           # ブラウザツールのドキュメント
│   ├── shrink-dom/             # DOM処理ツール
│   │   └── src/                # DOM処理のソースコード
│   └── share/                  # 共有ツールとコンポーネント
│
├── package.json                # プロジェクトの依存関係とスクリプト
├── nx.json                     # Nx設定
├── commitlint.config.js        # コミット規約設定
├── .gitignore                  # Git無視設定
└── README.md                   # プロジェクトドキュメント
```

### コアディレクトリの説明

- **apps/main**: Electronメインプロセスのコードとバックエンドロジックを含む
  - エージェントシステム（`agent/`）：マルチエージェント協力作業メカニズムを実装
  - ツールキット（`toolkits/`）：さまざまな機能ツールの実装
  - データベース（`prisma/`）：Prisma ORMとSQLiteを使用してデータを管理

- **apps/renderer**: Reactで実装されたフロントエンドインターフェースコードを含む

- **packages/electron-browseruse**: AI駆動のウェブインタラクションをサポートするブラウザ自動化ツールキット

- **packages/shrink-dom**: ウェブコンテンツの抽出と分析を最適化するDOM処理ツールキット
  
- **packages/share**: メインプロセスとレンダラープロセス間で共有されるコードとタイプ

## アーキテクチャ設計

![アーキテクチャ設計](../docs/architecture.png)

## インストール設定

## 貢献ガイド

LuguManusプロジェクトの開発と改善に参加することをコミュニティメンバーに心から歓迎します。貢献の基本的なプロセスは次のとおりです：

1. **プロジェクトリポジトリをフォーク**：GitHubでこのプロジェクトをあなたのアカウントにフォークします
2. **フォークをクローン**：`git clone https://github.com/YOUR-USERNAME/lugumanus.git`
3. **機能ブランチを作成**：`git checkout -b feature/your-feature-name`
4. **変更を提出**：
   - [Conventional Commits](https://www.conventionalcommits.org/)規約に従う
5. **フォークにプッシュ**：`git push origin feature/your-feature-name`
6. **プルリクエストを作成**：あなたのブランチからメインリポジトリのメインブランチへのプルリクエストを作成

### コード標準

- すべてのコードをTypeScriptで記述
- プロジェクトの既存のコードスタイルとパターンに従い、Biomeを使用してコードをフォーマット
- 新機能のテストを作成
- 関連ドキュメントを更新

### 問題の報告

バグを見つけた場合や新機能の提案がある場合は、GitHub Issuesを通じて提出し、できるだけ詳細を提供してください：
- 明確な問題の説明
- 再現手順
- 期待される動作と実際の動作
- スクリーンショットやログ（該当する場合）
- システム環境情報

## ライセンス

LuguManusプロジェクトは[MITライセンス](../LICENSE)の下でオープンソース化されています。

## 謝辞

LuguManusプロジェクトの実現は、次のオープンソースプロジェクトと技術のサポートによって支えられています：

- [Electron](https://www.electronjs.org/) - クロスプラットフォームのデスクトップアプリケーション開発フレームワークを提供
- [TypeScript](https://www.typescriptlang.org/) - コードの型安全性を強化
- [React](https://reactjs.org/) - ユーザーインターフェース開発
- [Prisma](https://www.prisma.io/) - データベースORM
- [RxJS](https://rxjs.dev/) - リアクティブプログラミングライブラリ
- [OpenAI](https://openai.com/) - AIモデル技術サポート
- [Nx](https://nx.dev/) - ビルドシステムとプロジェクト管理

## 特別な感謝

- [CAMEL](https://github.com/camel-ai/camel) - 大規模モデルフレームワーク

プロジェクトに貢献したすべての開発者と貴重なフィードバックを提供したコミュニティメンバーに特別な感謝を捧げます。

## 連絡先

- **プロジェクトメンテナー**：WeChat（taixw2）
- **メール**：fex@0000o.net
- **GitHub**：[https://github.com/electron-manus]

より良いAIデスクトップツールを共に作成するために、あなたのフィードバックと提案をお待ちしています。 