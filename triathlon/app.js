const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WEEK_COLOURS = {
  Build: "var(--week-build)",
  Recovery: "var(--week-recovery)",
  Reduce: "var(--week-taper)",
  "Race week": "var(--week-race)"
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function sessionType(name) {
  if (/race/i.test(name)) return "race";
  if (/swim/i.test(name)) return "swim";
  if (/bike|ride|cycle/i.test(name)) return "bike";
  if (/run/i.test(name)) return "run";
  if (/strength/i.test(name)) return "strength";
  return "rest";
}

function addDetail(container, label, value) {
  if (value === undefined || value === null || value === "") return;

  const line = element("p", "detail");
  line.append(
    element("strong", "", `${label}: `),
    document.createTextNode(String(value))
  );
  container.append(line);
}

function renderSession(session, details = {}) {
  const name = typeof session === "string" ? session : session.name;
  const data = typeof session === "string"
    ? details
    : { ...session, ...details };
  const type = sessionType(name);

  // Rest days are plain labels, with no expandable details.
  if (type === "rest") {
    return element("div", "session rest", name);
  }

  const card = element("details", `session ${type}`);
  const summary = element("summary", "", name);
  const content = element("div", "session-details");
  let hasDetails = false;

  if (data.distance !== undefined && data.distance !== "") {
    const defaultUnit = type === "swim" ? "m" : "km";
    addDetail(
      content,
      "Distance",
      `${data.distance} ${data.unit || defaultUnit}`
    );
    hasDetails = true;
  }

  if (data.effort) {
    addDetail(content, "Effort", data.effort);
    hasDetails = true;
  }

  if (data.intervals) {
    addDetail(content, "Intervals", data.intervals);
    hasDetails = true;
  }

  if (!hasDetails) {
    content.append(element("p", "no-details", "No workout details added yet."));
  }

  card.append(summary, content);
  return card;
}

function scrollToCurrentWeek(root) {
  const current = root.querySelector(".week-row.current");
  // Before the plan starts or after race week there is no current row.
  // A URL hash means the visitor asked for a specific spot, so leave it alone.
  if (!current || location.hash) return;

  const scroll = () => current.scrollIntoView({ block: "start" });
  scroll();

  // Web fonts can shift the layout after the first paint, so scroll again.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scroll);
  }
}

function render(plan) {
  const root = document.getElementById("plan");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const raceDate = new Date(`${plan.raceDate}T00:00:00`);
  const daysUntilRace = Math.ceil((raceDate - today) / 86400000);

  document.title = plan.title || "70.3 Training Plan";
  document.getElementById("summary").textContent =
    daysUntilRace > 0
      ? `${daysUntilRace} days until race day`
      : "Race day";

  const startDate = new Date(`${plan.startDate}T00:00:00`);
  const currentWeek = Math.floor((today - startDate) / 604800000) + 1;

  plan.weeks.forEach(week => {
    const row = element(
      "section",
      `week-row${week.n === currentWeek ? " current" : ""}`
    );

    const weekMeta = element("div", "week-meta");
    weekMeta.style.setProperty(
      "--week-colour",
      WEEK_COLOURS[week.load] || "var(--line)"
    );

    weekMeta.append(
      element("span", "week-number", `Week ${week.n}`),
      element("span", "week-date", week.date),
      element("span", "week-phase", `${week.phase} · ${week.load}`)
    );

    if (week.note) {
      weekMeta.append(element("em", "week-note", week.note));
    }

    row.append(weekMeta);

    week.days.forEach((sessions, dayIndex) => {
      const day = element("div", "day");
      day.append(element("span", "day-name", DAYS[dayIndex]));

      const content = element("div", "day-content");

      sessions.forEach((session, sessionIndex) => {
        const key = `${week.n}-${dayIndex}-${sessionIndex}`;
        content.append(
          renderSession(session, plan.workouts?.[key] || {})
        );
      });

      day.append(content);
      row.append(day);
    });

    root.append(row);
  });

  scrollToCurrentWeek(root);
}

fetch("plan.json")
  .then(response => {
    if (!response.ok) {
      throw new Error(`Could not load plan.json (${response.status})`);
    }
    return response.json();
  })
  .then(render)
  .catch(error => {
    document.getElementById("plan").textContent =
      `Could not load plan.json. Check that it is beside index.html. ${error.message}`;
  });
