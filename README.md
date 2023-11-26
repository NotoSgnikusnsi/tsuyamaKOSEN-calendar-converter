# tsuyamaKOSEN-calendar-converter

## usage

```cmd
$ deno run --allow-net --unsafely-ignore-certificate-errors=www.tsuyama-ct.ac.jp app.ts
```

## 関数

- fullWidth2HalfWidth(): 全角数字を半角数字に変換する
- fetchHtmlSource():
  fetch(url)で取得したデータからhtmlのソースコードを取得し、返す
- extractAndConvertToJson()：取得したhtmlから必要な部分を抜き出し、json形式に変換して、返す

```json
{
  "4月": [
    "１日（土）～５日（水）": "春季休業", 
    "１日（土）": "開寮",
    ...
  ],
  "5月": [
    "８日（月）～１２日（金）": "専攻科推薦入試願書受付",
    "９日（火）": "学生総会"
    ...
  ],
  ...
}
```

- jsonToCsv():json形式のテキストをcsvに変換して、出力する

```csv
Subject,Start Date,End Date,All Day Event
春季休業,2023-04-01,2023-04-06,True
開寮,2023-04-01,2023-04-01,True
新入寮生荷物搬入,2023-04-02,2023-04-06,True
寮生集会,2023-04-04,2023-04-04,True
本科・専攻科入学式、本科新入生・留学生・編入生・専攻科２年オリエンテーション,2023-04-05,2023-04-05,True
...
```
