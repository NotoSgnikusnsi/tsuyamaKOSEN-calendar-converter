import {
  DOMParser, Element,
} from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";

// 月ごとのイベントを格納するオブジェクト
interface MonthlyEvents {
  [month: string]: EventData[];
}

// イベントのデータを格納するオブジェクト
interface EventData {
  [key: string]: string
}

// urlを指定してHTMLを取得する
// deno-lint-ignore ban-types
const fetchHtmlSource = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const html = await response.text();
  return html;
};

// HTMLを解析してJSONに変換する
const extractAndConvertToJson = (html: string): Object => {
  // 月ごとのイベントを格納するオブジェクト
  const events: MonthlyEvents = {};

  // DOMParserを使ってHTMLを解析する
  const domParser = new DOMParser();
  const document = domParser.parseFromString(html, "text/html");

  // 月を取得する
  const months = document!.querySelectorAll("div#contents_ver4 h4")!;

  // 月ごとにイベントを取得する
  months.forEach((MonthElement) => {
    const month = MonthElement.textContent.match(/[０-９]+/)![0];
    if (month) {
      // <ul>要素を取得
      const ulElement = (MonthElement as Element).nextElementSibling as Element;

      if (ulElement) {
        // <ul>内の各<li>要素を取得
        const listItems = ulElement.querySelectorAll("li");
        listItems.forEach((listItem) => {
          const [firstElement, secondElement, thirdElement] = listItem.textContent?.split("　") || [];
          const result = thirdElement ? [secondElement, thirdElement] : [firstElement, secondElement];
          const event: EventData = {
            [result[0]]: result[1],
          };
          events[month] = [...(events[month] || []), event];
        });
      }
    }
  });
  return events;
};

await fetchHtmlSource("https://www.tsuyama-ct.ac.jp/gyouji/gyouji.html").then(
  (html) => {
    console.log(extractAndConvertToJson(html));
  },
);
