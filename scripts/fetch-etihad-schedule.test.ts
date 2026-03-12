import assert from "node:assert";
import { parseDate, parseSchedulePage, type ScheduleFlight } from "./fetch-etihad-schedule";

// --- Test helpers ---

function makeCell(value: string): string {
  return `<td><div class="cell-container"><div class="cmp-text cmp-text-with-tooltip " data-emptytext="Text"><span>${value}</span></div></div></td>`;
}

function makeRow(col1: string, col2: string, col3: string): string {
  return `<tr>${makeCell(col1)}${makeCell(col2)}${makeCell(col3)}</tr>`;
}

function makeTable(rows: string[]): string {
  return `<table><thead><tr><th><div class="cell-container"><div class="cmp-text"><span>Flight No.</span></div></div></th><th><div class="cell-container"><div class="cmp-text"><span>To</span></div></div></th><th><div class="cell-container"><div class="cmp-text"><span>Departure Time</span></div></div></th></tr></thead><tbody>${rows.join("\n")}</tbody></table>`;
}

function makeAccordionItem(date: string, table: string): string {
  return `<div class="cmp-accordion__item" data-cmp-hook-accordion="item" data-cmp-data-layer="{&quot;acc-item&quot;:{&quot;@type&quot;:&quot;etihadairways/components/core/accordion/item&quot;,&quot;dc:title&quot;:&quot;${date}&quot;}}" id="acc-item"><h3 class="cmp-accordion__header"><button class="cmp-accordion__button"><span class="cmp-accordion__title">${date}</span></button></h3><div class="cmp-accordion__panel">${table}</div></div>`;
}

function makeTabPanel(direction: string, content: string, active: boolean = false): string {
  const activeClass = active ? " cmp-tabs__tabpanel--active" : "";
  const title = direction === "from_auh" ? "From Abu Dhabi" : "To Abu Dhabi";
  return `<div role="tabpanel" tabindex="0" class="cmp-tabs__tabpanel${activeClass}" data-cmp-hook-tabs="tabpanel" data-cmp-data-layer="{&quot;schedule-item&quot;:{&quot;@type&quot;:&quot;etihadairways/components/core/tab/item&quot;,&quot;dc:title&quot;:&quot;${title}&quot;}}">${content}</div>`;
}

function makeScheduleSection(panels: string[]): string {
  return `<html><body><div class="tab tabs"><div id="schedule" class="cmp-tabs"><ol role="tablist" class="cmp-tabs__tablist"><li role="tab" class="cmp-tabs__tab">From Abu Dhabi</li><li role="tab" class="cmp-tabs__tab">To Abu Dhabi</li></ol>${panels.join("\n")}</div></div></body></html>`;
}

// --- parseDate tests ---

console.log("Testing parseDate...");

assert.strictEqual(parseDate("12 March 2026"), "2026-03-12");
assert.strictEqual(parseDate("1 January 2025"), "2025-01-01");
assert.strictEqual(parseDate("31 December 2024"), "2024-12-31");
assert.strictEqual(parseDate("5 May 2026"), "2026-05-05");
assert.strictEqual(parseDate(""), "");
assert.strictEqual(parseDate("invalid"), "");
assert.strictEqual(parseDate("12 Foo 2026"), "");
assert.strictEqual(parseDate("March 12, 2026"), "");

console.log("  parseDate: all passed");

// --- parseSchedulePage tests ---

console.log("Testing parseSchedulePage...");

// Test: parses "From Abu Dhabi" flights
{
  const table = makeTable([
    makeRow("EY615", "Jeddah", "08:05"),
    makeRow("EY203", "London Heathrow", "14:30"),
  ]);
  const accordion = makeAccordionItem("12 March 2026", table);
  const panel = makeTabPanel("from_auh", accordion, true);
  const html = makeScheduleSection([panel]);

  const flights = parseSchedulePage(html);
  assert.strictEqual(flights.length, 2);
  assert.deepStrictEqual(flights[0], {
    flightNumber: "EY615",
    flightDate: "2026-03-12",
    direction: "from_auh",
    cityName: "Jeddah",
    scheduledTime: "08:05",
  });
  assert.deepStrictEqual(flights[1], {
    flightNumber: "EY203",
    flightDate: "2026-03-12",
    direction: "from_auh",
    cityName: "London Heathrow",
    scheduledTime: "14:30",
  });
  console.log("  From Abu Dhabi parsing: passed");
}

// Test: parses "To Abu Dhabi" flights
{
  const table = makeTable([
    makeRow("EY289", "Lahore", "00:30"),
  ]);
  const accordion = makeAccordionItem("13 March 2026", table);
  const panel = makeTabPanel("to_auh", accordion);
  const html = makeScheduleSection([panel]);

  const flights = parseSchedulePage(html);
  assert.strictEqual(flights.length, 1);
  assert.strictEqual(flights[0].direction, "to_auh");
  assert.strictEqual(flights[0].flightNumber, "EY289");
  assert.strictEqual(flights[0].cityName, "Lahore");
  assert.strictEqual(flights[0].flightDate, "2026-03-13");
  console.log("  To Abu Dhabi parsing: passed");
}

// Test: handles multiple dates per direction
{
  const table1 = makeTable([makeRow("EY615", "Jeddah", "08:05")]);
  const table2 = makeTable([makeRow("EY100", "New York", "02:30")]);
  const accordion = makeAccordionItem("12 March 2026", table1) + makeAccordionItem("13 March 2026", table2);
  const panel = makeTabPanel("from_auh", accordion, true);
  const html = makeScheduleSection([panel]);

  const flights = parseSchedulePage(html);
  assert.strictEqual(flights.length, 2);
  assert.strictEqual(flights[0].flightDate, "2026-03-12");
  assert.strictEqual(flights[1].flightDate, "2026-03-13");
  console.log("  Multiple dates: passed");
}

// Test: both directions together
{
  const fromTable = makeTable([makeRow("EY615", "Jeddah", "08:05")]);
  const toTable = makeTable([makeRow("EY289", "Lahore", "00:30")]);
  const fromAccordion = makeAccordionItem("12 March 2026", fromTable);
  const toAccordion = makeAccordionItem("12 March 2026", toTable);
  const fromPanel = makeTabPanel("from_auh", fromAccordion, true);
  const toPanel = makeTabPanel("to_auh", toAccordion);
  const html = makeScheduleSection([fromPanel, toPanel]);

  const flights = parseSchedulePage(html);
  assert.strictEqual(flights.length, 2);
  const fromFlights = flights.filter(f => f.direction === "from_auh");
  const toFlights = flights.filter(f => f.direction === "to_auh");
  assert.strictEqual(fromFlights.length, 1);
  assert.strictEqual(toFlights.length, 1);
  assert.strictEqual(fromFlights[0].flightNumber, "EY615");
  assert.strictEqual(toFlights[0].flightNumber, "EY289");
  console.log("  Both directions: passed");
}

// Test: returns empty array for missing schedule section
{
  const flights = parseSchedulePage("<html><body>No schedule here</body></html>");
  assert.strictEqual(flights.length, 0);
  console.log("  Missing schedule section: passed");
}

// Test: returns empty array for empty HTML
{
  const flights = parseSchedulePage("");
  assert.strictEqual(flights.length, 0);
  console.log("  Empty HTML: passed");
}

// Test: skips rows with invalid flight numbers
{
  const table = makeTable([
    makeRow("EY615", "Jeddah", "08:05"),
    makeRow("INVALID", "London", "14:30"),
    makeRow("EY", "Paris", "10:00"),
  ]);
  const accordion = makeAccordionItem("12 March 2026", table);
  const panel = makeTabPanel("from_auh", accordion, true);
  const html = makeScheduleSection([panel]);

  const flights = parseSchedulePage(html);
  assert.strictEqual(flights.length, 1);
  assert.strictEqual(flights[0].flightNumber, "EY615");
  console.log("  Invalid flight numbers filtered: passed");
}

// Test: handles flight number with trailing space (as seen in real HTML)
{
  const table = makeTable([makeRow("EY615 ", "Jeddah", "08:05")]);
  const accordion = makeAccordionItem("12 March 2026", table);
  const panel = makeTabPanel("from_auh", accordion, true);
  const html = makeScheduleSection([panel]);

  const flights = parseSchedulePage(html);
  assert.strictEqual(flights.length, 1);
  assert.strictEqual(flights[0].flightNumber, "EY615");
  console.log("  Trailing space in flight number: passed");
}

console.log("\nAll tests passed!");
