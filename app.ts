import {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";
import "https://deno.land/x/dotenv/load.ts";

// 日付のパターンを正規表現で定義する
const date_pattern = "([0-9]+)日";
const day_range_pattern = "([0-9]+)日.*?～([0-9]+)日";
const day_month_range_pattern = "([0-9]+)日.*?～([0-9]+)月([0-9]+)日";
const day_month_range_pattern_2 =
  "([0-9]+)月([0-9]+)日.*?～([0-9]+)月([0-9]+)日";

// 月ごとのイベントを格納するオブジェクト
interface MonthlyEvents {
  [month: string]: EventData[];
}

// イベントのデータを格納するオブジェクト
interface EventData {
  [key: string]: string;
}

// 数字が1桁の場合は0埋めする
const zeroPadding = (num: string): string => {
  return ("0" + num).slice(-2);
};

// パターンにマッチするかどうかを判定する
const matchPattern = (date: string, pattern: string): boolean => {
  const regexp = new RegExp(pattern);
  return regexp.test(date);
};

// 全角数字を半角数字に変換する
const fullWidth2HalfWidth = (src: string): string => {
  return src.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
};

// 和暦を西暦に変換する
const convertToGregorian = (era: string, year: number): number => {
  const currentYear = new Date().getFullYear();
  const currentEraYear = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
    era: "long",
    year: "numeric",
  }).format(new Date()).match(/..([0-9]+)/)![1];
  const currentEra = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
    era: "long",
    year: "numeric",
  }).format(new Date()).match(/(..)[0-9]+/)![1];

  if (era === currentEra) {
    if (year === Number(currentEraYear)) {
      return currentYear;
    } else {
      return currentYear - (Number(currentEraYear) - year);
    }
  } else {
    const eraStartYear = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
      era: "long",
      year: "numeric",
    }).format(new Date(year, 0)).match(/..([0-9]+)/)![1];
    return year + (currentYear - Number(eraStartYear));
  }
};

// urlを指定してHTMLを取得する
const fetchHtmlSource = async (): Promise<string> => {
  const proxyUrl = Deno.env.get("PROXY_SERVER");
  if (!proxyUrl) {
    throw new Error("PROXY_URL is not defined");
  }

  const response = await fetch(proxyUrl);
  const html = await response.text();
  return html;
};

// 年を取得する
const getYear = (html: string): number => {
  const domParser = new DOMParser();
  const document = domParser.parseFromString(html, "text/html");

  // 予定表の年を取得する関数
  const getScheduleYear = (): string => {
    const scheduleYear = fullWidth2HalfWidth(
      document!.querySelector("div#contents_ver4 h3")!.innerText,
    ).match(/..[0-9]+/);
    if (!scheduleYear) {
      throw new Error("Schedule year not found");
    }
    return scheduleYear[0];
  };

  // 年を元号と年に分ける関数
  const splitYear = (year: string): [string, string] => {
    const match = year.match(/(..)([0-9]+)/);
    if (!match) {
      throw new Error("Invalid year format");
    }
    return [match[1], match[2]];
  };

  const [scheduleEra, scheduleYear] = splitYear(getScheduleYear());
  const year = convertToGregorian(scheduleEra, Number(scheduleYear));
  return year;
};

// HTMLを解析してオブジェクトに変換する
const extractAndConvertToObject = (html: string): Promise<MonthlyEvents> => {
  // 月ごとのイベントを格納するオブジェクト
  const events: MonthlyEvents = {};

  // DOMParserを使ってHTMLを解析する
  const domParser = new DOMParser();
  const document = domParser.parseFromString(html, "text/html");

  // 月を取得する
  const months = document!.querySelectorAll("div#contents_ver4 h4")!;

  // 月ごとにイベントを取得する
  months.forEach((MonthElement) => {
    const monthZenkaku = MonthElement.textContent.match(/[０-９]+/)![0];
    const month = zeroPadding(fullWidth2HalfWidth(monthZenkaku));
    if (month) {
      // <ul>要素を取得
      const ulElement = (MonthElement as Element).nextElementSibling as Element;

      if (ulElement) {
        // <ul>内の各<li>要素を取得
        const listItems = ulElement.querySelectorAll("li");
        listItems.forEach((listItem) => {
          const [firstElement, secondElement, thirdElement] =
            listItem.textContent?.split("　") || [];
          const result = thirdElement
            ? [secondElement, thirdElement]
            : [firstElement, secondElement];
          const event: EventData = {
            [fullWidth2HalfWidth(result[0])]: result[1],
          };
          events[month] = [...(events[month] || []), event];
        });
      }
    }
  });
  return JSON.parse(JSON.stringify(events));
};

// オブジェクトをCSVに変換する
const jsonToCsv = (json: MonthlyEvents, year: number): string => {
  // CSVを格納する配列
  const csv: string[] = [];

  // CSVのヘッダーを追加する
  csv.push("Subject,Start Date,End Date,All Day Event");

  // 月ごとに処理する
  Object.keys(json).map((key) => {
    const month = key;
    const events: EventData[] = json[key];

    // イベントごとに処理する
    events.map((event: EventData) => {
      // 日付と予定名を取得する
      const date = Object.keys(event)[0];
      const eventName = event[date];

      // 日付のパターンにマッチするかどうかを判定する
      if (matchPattern(date, day_month_range_pattern_2)) {
        // 予定が重複するためこのパターンの時、何も処理しない
      } else if (matchPattern(date, day_month_range_pattern)) {
        const result = date.match(day_month_range_pattern);
        const startDay = result![1];
        const endDay = parseInt(result![3]) + 1;
        const endMonth = result![2];
        if (month === "01" || month === "02" || month === "03") {
          return csv.push(
            `${eventName},${year + 1}-${month}-${startDay},${
              year + 1
            }-${endMonth}-${endDay},True`,
          );
        } else if (
          endMonth === "01" || endMonth === "02" || endMonth === "03"
        ) {
          return csv.push(
            `${eventName},${year}-${month}-${startDay},${
              year + 1
            }-${endMonth}-${endDay},True`,
          );
        }
        return csv.push(
          `${eventName},${year}-${month}-${startDay},${year}-${month}-${endDay},True`,
        );
      } else if (matchPattern(date, day_range_pattern)) {
        const result = date.match(day_range_pattern);
        const startDay = result![1];
        const endDay = parseInt(result![2]) + 1;
        if (month === "01" || month === "02" || month === "03") {
          return csv.push(
            `${eventName},${year + 1}-${month}-${startDay},${
              year + 1
            }-${month}-${endDay},True`,
          );
        }
        return csv.push(
          `${eventName},${year}-${month}-${startDay},${year}-${month}-${endDay},True`,
        );
      } else if (matchPattern(date, date_pattern)) {
        const result = date.match(date_pattern);
        const day = result![1];
        if (month === "01" || month === "02" || month === "03") {
          return csv.push(
            `${eventName},${year + 1}-${month}-${day},${
              year + 1
            }-${month}-${day},True`,
          );
        }
        return csv.push(
          `${eventName},${year}-${month}-${day},${year}-${month}-${day},True`,
        );
      }
    });
  });

  return csv.join("\n");
};

// オブジェクトをiCalに変換する
const jsonToIcal = (json: MonthlyEvents, year: number): string => {
  // CSVを格納する配列
  const ical: string[] = [];

  // CSVのヘッダーを追加する
  ical.push(
    "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//sysken/noto//TsuyamaKosenSchedule v1.0//JP",
  );

  // 月ごとに処理する
  Object.keys(json).map((key) => {
    const month = key;
    const events: EventData[] = json[key];

    // イベントごとに処理する
    events.map((event: EventData) => {
      // イベントの開始を示す行を追加する
      ical.push("BEGIN:VEVENT");

      // 日付と予定名を取得する
      const date = Object.keys(event)[0];
      const eventName = event[date];

      // 日付のパターンにマッチするかどうかを判定する
      if (matchPattern(date, day_month_range_pattern_2)) {
        // 予定が重複するためこのパターンの時、何も処理しない
      } else if (matchPattern(date, day_month_range_pattern)) {
        const result = date.match(day_month_range_pattern);
        const startDay = zeroPadding(result![1]);
        const endDay = zeroPadding((Number(result![3]) + 1).toString());
        const endMonth = zeroPadding(result![2]);
        if (month === "01" || month === "02" || month === "03") {
          return ical.push(
            `SUMMARY:${eventName}\nDTSTART:${
              year + 1
            }${month}${startDay}\nDTEND:${
              year + 1
            }${endMonth}${endDay}\nEND:VEVENT`,
          );
        } else if (
          endMonth === "01" || endMonth === "02" || endMonth === "03"
        ) {
          return ical.push(
            `SUMMARY:${eventName}\nDTSTART:${year}${month}${startDay}\nDTEND:${
              year + 1
            }${endMonth}${endDay}\nEND:VEVENT`,
          );
        }
        return ical.push(
          `SUMMARY:${eventName}\nDTSTART:${year}${month}${startDay}\nDTEND:${year}${endMonth}${endDay}\nEND:VEVENT`,
        );
      } else if (matchPattern(date, day_range_pattern)) {
        const result = date.match(day_range_pattern);
        const startDay = zeroPadding(result![1]);
        const endDay = zeroPadding((Number(result![2]) + 1).toString());
        if (month === "01" || month === "02" || month === "03") {
          return ical.push(
            `SUMMARY:${eventName}\nDTSTART:${
              year + 1
            }${month}${startDay}\nDTEND:${
              year + 1
            }${month}${endDay}\nEND:VEVENT`,
          );
        }
        return ical.push(
          `SUMMARY:${eventName}\nDTSTART:${year}${month}${startDay}\nDTEND:${year}${month}${endDay}\nEND:VEVENT`,
        );
      } else if (matchPattern(date, date_pattern)) {
        const result = date.match(date_pattern);
        const day = zeroPadding(result![1]);
        if (month === "01" || month === "02" || month === "03") {
          return ical.push(
            `SUMMARY:${eventName}\nDTSTART:${year + 1}${month}${day}\nDTEND:${
              year + 1
            }${month}${day}\nEND:VEVENT`,
          );
        }
        return ical.push(
          `SUMMARY:${eventName}\nDTSTART:${year}${month}${day}\nDTEND:${year}${month}${day}\nEND:VEVENT`,
        );
      }
      return ical.push("END:VEVENT");
    });
  });

  // iCalの終了を示す行を追加する
  ical.push("END:VCALENDAR");
  return ical.join("\n").replace(/BEGIN:VEVENT\nEND:VEVENT\n/g, "");
};

// CSVを作成する
export const CreateCsv = async (): Promise<string> => {
  const html = await fetchHtmlSource();
  const year = getYear(html);
  const json = await extractAndConvertToObject(html);
  return jsonToCsv(json, year);
};

// iCalを作成する
export const CreateIcal = async (): Promise<string> => {
  const html = await fetchHtmlSource();
  const year = getYear(html);
  const json = await extractAndConvertToObject(html);
  return jsonToIcal(json, year);
};
