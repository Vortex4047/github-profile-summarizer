function byId(id) {
  return document.getElementById(id);
}

const refs = {
  form: byId("user-form"),
  usernameInput: byId("username-input"),
  headline: byId("headline"),
  periodSwitch: byId("period-switch"),
  eventFilter: byId("event-filter"),
  heatmap: byId("heatmap"),
  heatmapCaption: byId("heatmap-caption"),
  tooltip: byId("tooltip"),
  repoList: byId("repo-list"),
  repoCaption: byId("repo-caption"),
  repoPageInfo: byId("repo-page-info"),
  repoPrevButton: byId("repo-prev"),
  repoNextButton: byId("repo-next"),
  repoSearch: byId("repo-search"),
  repoSort: byId("repo-sort"),
  repoHideForks: byId("repo-hide-forks"),
  languageChart: byId("language-chart"),
  activityStream: byId("activity-stream"),
  statusText: byId("status"),
  profileAvatar: byId("profile-avatar"),
  profileName: byId("profile-name"),
  profileBio: byId("profile-bio"),
  profileMeta: byId("profile-meta"),
  profileUpdated: byId("profile-updated"),
  eventBreakdown: byId("event-breakdown"),
  trendSparkline: byId("trend-sparkline"),
  momentumStats: byId("momentum-stats"),
  milestones: byId("milestones"),
  compareForm: byId("compare-form"),
  compareLeftInput: byId("compare-left"),
  compareRightInput: byId("compare-right"),
  compareResults: byId("compare-results"),
  exportJsonButton: byId("export-json"),
  exportPngButton: byId("export-png"),
  exportPdfButton: byId("export-pdf"),
  copySummaryButton: byId("copy-summary"),
  posterRoot: byId("export-poster"),
  posterTitle: byId("poster-title"),
  posterDate: byId("poster-date"),
  posterMetrics: byId("poster-metrics"),
  posterRepos: byId("poster-repos"),
  posterMilestones: byId("poster-milestones"),
  posterTrend: byId("poster-trend"),
  posterTrendCaption: byId("poster-trend-caption"),
};

const metricRefs = {
  stars: byId("metric-stars"),
  forks: byId("metric-forks"),
  repos: byId("metric-repos"),
  followers: byId("metric-followers"),
  pushes: byId("metric-pushes"),
  activeDays: byId("metric-active-days"),
  streak: byId("metric-streak"),
};

const state = {
  selectedPeriod: 30,
  selectedEventType: "all",
  currentUser: null,
  currentRepos: [],
  currentEvents: [],
  currentRepoPage: 1,
  reposPerPage: 6,
};

const numberFmt = new Intl.NumberFormat();
const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

let revealObserver = null;

function setStatus(message, isError = false) {
  if (!refs.statusText) return;
  refs.statusText.textContent = message;
  refs.statusText.classList.toggle("error", isError);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatEventTypeName(type) {
  if (type === "all") return "All Events";
  return String(type).replace("Event", "").replace(/([A-Z])/g, " $1").trim();
}

function showNoDataMessage(username) {
  const name = username ? `@${username}` : "this user";
  setStatus(`Loaded ${name}, but no recent public activity was returned by GitHub.`);
}

async function fetchGitHubJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || "GitHub request failed";
    throw new Error(`${message} (${response.status})`);
  }

  return payload;
}

async function fetchUserEvents(username, pages = 3) {
  const allEvents = [];

  for (let page = 1; page <= pages; page += 1) {
    const list = await fetchGitHubJson(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100&page=${page}`
    );
    if (!Array.isArray(list) || list.length === 0) {
      break;
    }
    allEvents.push(...list);
  }

  const deduped = new Map();
  allEvents.forEach((event) => {
    if (event?.id && !deduped.has(event.id)) {
      deduped.set(event.id, event);
    }
  });

  return Array.from(deduped.values())
    .map((event) => ({
      id: event.id,
      type: event.type,
      created_at: event.created_at,
      repo: { name: event.repo?.name || "" },
      commitCount: event.type === "PushEvent" ? event.payload?.commits?.length || 0 : 0,
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function fetchDashboardData(username) {
  const [user, repos, events] = await Promise.all([
    fetchGitHubJson(`https://api.github.com/users/${encodeURIComponent(username)}`),
    fetchGitHubJson(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`
    ),
    fetchUserEvents(username, 3),
  ]);

  return {
    user,
    repos: safeArray(repos),
    events: safeArray(events),
  };
}

function getEventsByType(events, type) {
  if (type === "all") return events;
  return events.filter((event) => event.type === type);
}

function getScopedEvents() {
  return getEventsByType(state.currentEvents, state.selectedEventType);
}

function getContributionsFromEvents(events, days, offsetDays = 0) {
  const map = new Map();
  const endDay = new Date();
  endDay.setHours(0, 0, 0, 0);
  endDay.setDate(endDay.getDate() - offsetDays);

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(endDay);
    day.setDate(day.getDate() - i);
    map.set(day.toISOString().slice(0, 10), 0);
  }

  events.forEach((event) => {
    const eventDate = new Date(event.created_at);
    eventDate.setHours(0, 0, 0, 0);
    const key = eventDate.toISOString().slice(0, 10);
    if (map.has(key)) {
      map.set(key, map.get(key) + 1);
    }
  });

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

function getLongestStreak(contributions) {
  let longest = 0;
  let current = 0;

  contributions.forEach((entry) => {
    if (entry.count > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  });

  return longest;
}

function activityLevel(count, maxCount) {
  if (count === 0) return "l0";
  const ratio = count / maxCount;
  if (ratio <= 0.25) return "l1";
  if (ratio <= 0.5) return "l2";
  if (ratio <= 0.75) return "l3";
  return "l4";
}

function ensureRevealObserver() {
  if (revealObserver || !("IntersectionObserver" in window)) return;

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const node = entry.target;
        node.classList.add("active");
        node.classList.remove("reveal-pending");

        if (node.classList.contains("section-head")) {
          node.classList.add("neon-flicker");
          node.addEventListener(
            "animationend",
            () => {
              node.classList.remove("neon-flicker");
            },
            { once: true }
          );
        }

        revealObserver.unobserve(node);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    }
  );
}

function markReveal(element, delayMs = 0) {
  if (!element) return;

  element.classList.add("reveal", "stagger-delay");
  element.style.setProperty("--stagger-delay", `${Math.max(0, delayMs)}ms`);

  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.classList.add("active");
    element.classList.remove("reveal-pending");
    return;
  }

  document.body.classList.add("js-reveal");
  element.classList.add("reveal-pending");
  ensureRevealObserver();
  revealObserver.observe(element);
}

function initializeRevealBase() {
  const nodes = Array.from(
    new Set([
      ...document.querySelectorAll(".card"),
      ...document.querySelectorAll(".metric"),
      ...document.querySelectorAll(".section-head"),
      refs.statusText,
      document.querySelector(".easter-hint"),
    ])
  ).filter(Boolean);

  nodes.forEach((node, index) => {
    markReveal(node, Math.min(index * 45, 360));
  });

  window.setTimeout(() => {
    document.querySelectorAll(".reveal.reveal-pending").forEach((node) => {
      node.classList.remove("reveal-pending");
      node.classList.add("active");
    });
  }, 3500);
}

function renderProfile(user) {
  if (!refs.profileAvatar || !refs.profileName || !refs.profileBio || !refs.profileUpdated || !refs.profileMeta) {
    return;
  }

  refs.profileAvatar.src = user.avatar_url || "";
  refs.profileName.textContent = user.name || `@${user.login}`;
  refs.profileBio.textContent = user.bio || "No bio available.";
  refs.profileUpdated.textContent = `Updated ${user.updated_at ? dateFmt.format(new Date(user.updated_at)) : "-"}`;

  const profileItems = [
    { label: "Username", value: `@${user.login}` },
    { label: "Location", value: user.location || "Unknown" },
    { label: "Company", value: user.company || "Independent" },
    { label: "Blog", value: user.blog || "Not provided" },
    { label: "Joined", value: user.created_at ? dateFmt.format(new Date(user.created_at)) : "-" },
    { label: "Following", value: numberFmt.format(user.following || 0) },
  ];

  refs.profileMeta.innerHTML = "";
  profileItems.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "meta-chip";
    chip.innerHTML = `<strong>${item.label}</strong>${item.value}`;
    refs.profileMeta.appendChild(chip);
    markReveal(chip, 60);
  });
}

function renderMetrics() {
  if (!metricRefs.stars || !metricRefs.forks || !metricRefs.repos || !metricRefs.followers || !metricRefs.pushes) {
    return;
  }

  const totalStars = state.currentRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const totalForks = state.currentRepos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
  const pushes = state.currentEvents.filter((event) => event.type === "PushEvent").length;

  metricRefs.stars.textContent = numberFmt.format(totalStars);
  metricRefs.forks.textContent = numberFmt.format(totalForks);
  metricRefs.repos.textContent = numberFmt.format(state.currentUser?.public_repos || 0);
  metricRefs.followers.textContent = numberFmt.format(state.currentUser?.followers || 0);
  metricRefs.pushes.textContent = numberFmt.format(pushes);
}

function renderHeatmap() {
  if (!refs.heatmap || !refs.heatmapCaption || !metricRefs.activeDays || !metricRefs.streak) return;

  const events = getScopedEvents();
  const contributions = getContributionsFromEvents(events, state.selectedPeriod);

  refs.heatmap.innerHTML = "";
  const maxCount = Math.max(...contributions.map((d) => d.count), 1);
  const columns = Math.ceil(Math.sqrt(contributions.length * 1.6));
  refs.heatmap.style.gridTemplateColumns = `repeat(${columns}, minmax(16px, 1fr))`;

  contributions.forEach((entry) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `heat-cell ${activityLevel(entry.count, maxCount)}`;
    cell.setAttribute(
      "aria-label",
      `${entry.count} activities on ${dateFmt.format(new Date(entry.date))}`
    );

    cell.addEventListener("mousemove", (event) => {
      if (!refs.tooltip) return;
      refs.tooltip.classList.remove("hidden");
      refs.tooltip.innerHTML = `<strong>${entry.count}</strong> activities<br>${dateFmt.format(
        new Date(entry.date)
      )}`;

      const bounds = refs.heatmap.getBoundingClientRect();
      refs.tooltip.style.left = `${Math.min(event.clientX - bounds.left + 12, bounds.width - 120)}px`;
      refs.tooltip.style.top = `${event.clientY - bounds.top - 14}px`;
    });

    cell.addEventListener("mouseleave", () => {
      if (refs.tooltip) refs.tooltip.classList.add("hidden");
    });

    refs.heatmap.appendChild(cell);
  });

  const total = contributions.reduce((sum, day) => sum + day.count, 0);
  const activeDays = contributions.filter((day) => day.count > 0).length;
  const streak = getLongestStreak(contributions);

  refs.heatmapCaption.textContent = `${numberFmt.format(total)} ${formatEventTypeName(
    state.selectedEventType
  ).toLowerCase()} across ${state.selectedPeriod} days`;

  metricRefs.activeDays.textContent = numberFmt.format(activeDays);
  metricRefs.streak.textContent = `${numberFmt.format(streak)} days`;
}

function renderLanguageChart() {
  if (!refs.languageChart) return;

  refs.languageChart.innerHTML = "";
  const languageCount = new Map();

  state.currentRepos.forEach((repo) => {
    if (repo.language) {
      languageCount.set(repo.language, (languageCount.get(repo.language) || 0) + 1);
    }
  });

  const total = Array.from(languageCount.values()).reduce((sum, count) => sum + count, 0);
  const topLangs = Array.from(languageCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (!topLangs.length) {
    refs.languageChart.innerHTML = "<p>No language data available.</p>";
    return;
  }

  topLangs.forEach(([language, count], index) => {
    const percent = ((count / total) * 100).toFixed(1);
    const row = document.createElement("div");
    row.className = "lang-row";
    row.innerHTML = `
      <div class="lang-label">
        <span>${language}</span>
        <span>${percent}%</span>
      </div>
      <div class="lang-bar">
        <div class="lang-fill" style="width:${percent}%"></div>
      </div>
    `;
    refs.languageChart.appendChild(row);
    markReveal(row, index * 60);
  });
}

function renderEventBreakdown() {
  if (!refs.eventBreakdown) return;

  const events = getScopedEvents();
  refs.eventBreakdown.innerHTML = "";
  if (!events.length) {
    refs.eventBreakdown.innerHTML = "<p>No events available for breakdown.</p>";
    return;
  }

  const typeCounts = new Map();
  events.forEach((event) => {
    const key = formatEventTypeName(event.type);
    typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
  });

  const topTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const total = events.length;

  topTypes.forEach(([type, count], index) => {
    const percent = Math.round((count / total) * 100);
    const row = document.createElement("div");
    row.className = "event-row";
    row.innerHTML = `
      <div class="event-label">
        <span>${type}</span>
        <span>${percent}%</span>
      </div>
      <div class="event-bar">
        <div class="event-fill" style="width:${percent}%"></div>
      </div>
    `;
    refs.eventBreakdown.appendChild(row);
    markReveal(row, index * 70);
  });
}

function renderTrendIntoSvg(svgElement, contributions, width, height) {
  if (!svgElement) return;
  const values = contributions.map((d) => d.count);
  const max = Math.max(...values, 1);
  const xStep = width / Math.max(values.length - 1, 1);

  const points = values
    .map((value, index) => {
      const x = index * xStep;
      const y = height - (value / max) * (height - 10) - 5;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;
  svgElement.innerHTML = `
    <polyline points="${points}" fill="none" stroke="#35b5ff" stroke-width="2.8" />
    <polygon points="${areaPoints}" fill="rgba(45, 234, 155, 0.18)" />
  `;
}

function renderSparkline() {
  const contributions = getContributionsFromEvents(getScopedEvents(), 30);
  renderTrendIntoSvg(refs.trendSparkline, contributions, 420, 100);
}

function renderMomentum() {
  if (!refs.momentumStats) return;

  const events = getScopedEvents();
  const current30 = getContributionsFromEvents(events, 30, 0);
  const previous30 = getContributionsFromEvents(events, 30, 30);
  const currentCount = current30.reduce((sum, day) => sum + day.count, 0);
  const previousCount = previous30.reduce((sum, day) => sum + day.count, 0);
  const avgPerDay = (currentCount / 30).toFixed(1);
  const busiestDay = Math.max(...current30.map((day) => day.count), 0);

  let deltaLabel = "0.0%";
  if (previousCount === 0 && currentCount > 0) {
    deltaLabel = "+100.0%";
  } else if (previousCount > 0) {
    const delta = ((currentCount - previousCount) / previousCount) * 100;
    const sign = delta >= 0 ? "+" : "";
    deltaLabel = `${sign}${delta.toFixed(1)}%`;
  }

  refs.momentumStats.innerHTML = `
    <div class="momentum-tile">
      <p>30D vs prior 30D</p>
      <h4>${deltaLabel}</h4>
    </div>
    <div class="momentum-tile">
      <p>Current 30D Events</p>
      <h4>${numberFmt.format(currentCount)}</h4>
    </div>
    <div class="momentum-tile">
      <p>Average Daily Activity</p>
      <h4>${avgPerDay}</h4>
    </div>
    <div class="momentum-tile">
      <p>Busiest Day</p>
      <h4>${numberFmt.format(busiestDay)} events</h4>
    </div>
  `;

  refs.momentumStats.querySelectorAll(".momentum-tile").forEach((tile, index) => {
    markReveal(tile, index * 80);
  });
}

function renderActivity() {
  if (!refs.activityStream) return;

  const events = getScopedEvents();
  refs.activityStream.innerHTML = "";
  const items = events.slice(0, 15);

  if (!items.length) {
    refs.activityStream.innerHTML = "<p>No recent public activity found.</p>";
    return;
  }

  items.forEach((event, index) => {
    const block = document.createElement("div");
    block.className = "activity-item";
    const commitInfo = event.type === "PushEvent" ? `<br><span>${event.commitCount || 0} commits</span>` : "";
    block.innerHTML = `
      <strong>${event.type}</strong><br>
      <span>${event.repo?.name || "unknown/repo"}</span><br>
      <span>${event.created_at ? dateTimeFmt.format(new Date(event.created_at)) : "-"}</span>
      ${commitInfo}
    `;
    refs.activityStream.appendChild(block);
    markReveal(block, index * 70);
  });
}

function getFilteredRepos() {
  const query = refs.repoSearch ? refs.repoSearch.value.trim().toLowerCase() : "";
  const mode = refs.repoSort ? refs.repoSort.value : "stars";
  const hideForks = refs.repoHideForks ? refs.repoHideForks.checked : false;

  let filtered = [...state.currentRepos];
  if (hideForks) {
    filtered = filtered.filter((repo) => !repo.fork);
  }
  if (query) {
    filtered = filtered.filter((repo) => repo.name.toLowerCase().includes(query));
  }

  if (mode === "forks") {
    filtered.sort((a, b) => b.forks_count - a.forks_count);
  } else if (mode === "updated") {
    filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  } else if (mode === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered.sort((a, b) => b.stargazers_count - a.stargazers_count);
  }

  return filtered;
}

function renderReposWithFilters(resetPage = false) {
  if (!refs.repoList || !refs.repoCaption || !refs.repoPageInfo || !refs.repoPrevButton || !refs.repoNextButton) {
    return;
  }

  if (resetPage) {
    state.currentRepoPage = 1;
  }

  const filteredRepos = getFilteredRepos();
  const totalPages = Math.max(1, Math.ceil(filteredRepos.length / state.reposPerPage));
  state.currentRepoPage = Math.min(state.currentRepoPage, totalPages);
  const start = (state.currentRepoPage - 1) * state.reposPerPage;
  const pageRepos = filteredRepos.slice(start, start + state.reposPerPage);

  refs.repoList.innerHTML = "";

  if (!pageRepos.length) {
    refs.repoList.innerHTML = "<p>No repositories match the selected filters.</p>";
  } else {
    pageRepos.forEach((repo, index) => {
      const el = document.createElement("article");
      el.className = "repo-card";
      const updated = repo.updated_at ? dateFmt.format(new Date(repo.updated_at)) : "-";
      const isFork = repo.fork ? "Forked" : "Original";
      el.innerHTML = `
        <a href="${repo.html_url}" target="_blank" rel="noreferrer">${repo.name}</a>
        <p class="repo-desc">${repo.description || "No description provided."}</p>
        <div class="repo-meta">
          <span>★ ${numberFmt.format(repo.stargazers_count || 0)}</span>
          <span>⑂ ${numberFmt.format(repo.forks_count || 0)}</span>
          <span>${repo.language || "Unknown"}</span>
          <span>${isFork}</span>
          <span>Updated ${updated}</span>
        </div>
      `;
      refs.repoList.appendChild(el);
      markReveal(el, index * 90);
    });
  }

  const sortLabel = refs.repoSort ? refs.repoSort.value : "stars";
  refs.repoCaption.textContent = `${numberFmt.format(filteredRepos.length)} repos • sorted by ${sortLabel}`;
  refs.repoPageInfo.textContent = `Page ${state.currentRepoPage} / ${totalPages}`;
  refs.repoPrevButton.disabled = state.currentRepoPage <= 1;
  refs.repoNextButton.disabled = state.currentRepoPage >= totalPages;
}

function renderMilestones() {
  if (!refs.milestones) return;

  const events = getScopedEvents();
  const contributions = getContributionsFromEvents(events, state.selectedPeriod);
  const streak = getLongestStreak(contributions);
  const activeDays = contributions.filter((day) => day.count > 0).length;
  const totalStars = state.currentRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const languageCount = new Set(state.currentRepos.map((r) => r.language).filter(Boolean)).size;
  const pushCount = state.currentEvents.filter((event) => event.type === "PushEvent").length;

  const badges = [];
  if ((state.currentUser?.public_repos || 0) >= 10) badges.push("Repository Builder");
  if (totalStars >= 50) badges.push("Star Collector");
  if ((state.currentUser?.followers || 0) >= 25) badges.push("Community Magnet");
  if (languageCount >= 4) badges.push("Polyglot Coder");
  if (streak >= 7) badges.push("Consistency Streak");
  if (activeDays >= Math.ceil(state.selectedPeriod * 0.4)) badges.push("Daily Momentum");
  if (pushCount >= 30) badges.push("Shipping Machine");
  if (state.currentEvents.some((event) => event.type === "PullRequestEvent")) badges.push("PR Collaborator");
  if (!badges.length) badges.push("Journey Started");

  refs.milestones.innerHTML = "";
  badges.forEach((badge, index) => {
    const chip = document.createElement("span");
    chip.className = "badge";
    chip.textContent = badge;
    refs.milestones.appendChild(chip);
    markReveal(chip, index * 70);
  });
}

function renderAll() {
  renderProfile(state.currentUser || {});
  renderMetrics();
  renderReposWithFilters(true);
  renderLanguageChart();
  renderHeatmap();
  renderEventBreakdown();
  renderSparkline();
  renderMomentum();
  renderActivity();
  renderMilestones();
}

function buildSnapshot() {
  if (!state.currentUser) return null;

  const scopedEvents = getScopedEvents();
  const filteredRepos = getFilteredRepos();
  const periodData = getContributionsFromEvents(scopedEvents, state.selectedPeriod);

  return {
    generatedAt: new Date().toISOString(),
    username: state.currentUser.login,
    selectedPeriodDays: state.selectedPeriod,
    selectedEventType: state.selectedEventType,
    metrics: {
      totalStars: state.currentRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0),
      totalForks: state.currentRepos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0),
      publicRepos: state.currentUser.public_repos || 0,
      followers: state.currentUser.followers || 0,
      recentPushEvents: state.currentEvents.filter((event) => event.type === "PushEvent").length,
      activeDays: periodData.filter((day) => day.count > 0).length,
      longestStreak: getLongestStreak(periodData),
      scopedEvents: scopedEvents.length,
    },
    topRepos: filteredRepos.slice(0, 8).map((repo) => ({
      name: repo.name,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      language: repo.language || "Unknown",
      url: repo.html_url,
    })),
    trend30: getContributionsFromEvents(scopedEvents, 30),
    recentEvents: scopedEvents.slice(0, 10),
  };
}

function exportSnapshotJson() {
  const snapshot = buildSnapshot();
  if (!snapshot) {
    setStatus("Load a profile first.", true);
    return;
  }

  const file = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${snapshot.username}-dashboard-snapshot.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(`Exported snapshot for @${snapshot.username}.`);
}

async function copySummaryToClipboard() {
  const snapshot = buildSnapshot();
  if (!snapshot) {
    setStatus("Load a profile first.", true);
    return;
  }

  const summary = [
    `GitHub Snapshot for @${snapshot.username}`,
    `Period: ${snapshot.selectedPeriodDays} days`,
    `Lens: ${snapshot.selectedEventType}`,
    `Total Stars: ${snapshot.metrics.totalStars}`,
    `Total Forks: ${snapshot.metrics.totalForks}`,
    `Public Repos: ${snapshot.metrics.publicRepos}`,
    `Followers: ${snapshot.metrics.followers}`,
    `Recent Push Events: ${snapshot.metrics.recentPushEvents}`,
    `Active Days: ${snapshot.metrics.activeDays}`,
    `Longest Streak: ${snapshot.metrics.longestStreak} days`,
    "Top Repos:",
    ...snapshot.topRepos.map((repo) => `- ${repo.name} ★${repo.stars} ⑂${repo.forks}`),
  ].join("\n");

  try {
    await navigator.clipboard.writeText(summary);
    setStatus("Summary copied to clipboard.");
  } catch (error) {
    setStatus("Clipboard access unavailable.", true);
  }
}

function renderPoster(snapshot) {
  if (!refs.posterRoot || !refs.posterTitle || !refs.posterDate || !refs.posterMetrics || !refs.posterRepos || !refs.posterMilestones || !refs.posterTrend || !refs.posterTrendCaption) {
    return;
  }

  refs.posterTitle.textContent = `@${snapshot.username} Development Journey`;
  refs.posterDate.textContent = `Generated ${dateTimeFmt.format(new Date(snapshot.generatedAt))}`;

  const metricRows = [
    ["Total Stars", snapshot.metrics.totalStars],
    ["Total Forks", snapshot.metrics.totalForks],
    ["Public Repos", snapshot.metrics.publicRepos],
    ["Followers", snapshot.metrics.followers],
    ["Active Days", snapshot.metrics.activeDays],
    ["Longest Streak", `${snapshot.metrics.longestStreak} days`],
  ];

  refs.posterMetrics.innerHTML = metricRows
    .map(
      ([label, value]) => `
      <div class="poster-metric">
        <p>${label}</p>
        <strong>${value}</strong>
      </div>
    `
    )
    .join("");

  refs.posterRepos.innerHTML = snapshot.topRepos
    .slice(0, 6)
    .map(
      (repo) => `
      <div class="poster-repo">
        <strong>${repo.name}</strong><br>
        ★ ${numberFmt.format(repo.stars)} • ⑂ ${numberFmt.format(repo.forks)} • ${repo.language}
      </div>
    `
    )
    .join("");

  refs.posterMilestones.innerHTML = `<span class="poster-badge">${formatEventTypeName(
    snapshot.selectedEventType
  )}</span>`;

  renderTrendIntoSvg(refs.posterTrend, snapshot.trend30, 520, 120);
  refs.posterTrendCaption.textContent = `${snapshot.selectedPeriodDays}-day view • ${numberFmt.format(
    snapshot.metrics.scopedEvents
  )} events`;
}

async function exportPosterPng() {
  const snapshot = buildSnapshot();
  if (!snapshot) {
    setStatus("Load a profile first.", true);
    return;
  }
  if (!window.html2canvas || !refs.posterRoot) {
    setStatus("PNG export unavailable.", true);
    return;
  }

  renderPoster(snapshot);
  await new Promise((resolve) => window.requestAnimationFrame(resolve));

  const canvas = await window.html2canvas(refs.posterRoot, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${snapshot.username}-github-journey-poster.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function exportPosterPdf() {
  const snapshot = buildSnapshot();
  if (!snapshot) {
    setStatus("Load a profile first.", true);
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas || !refs.posterRoot) {
    setStatus("PDF export unavailable.", true);
    return;
  }

  renderPoster(snapshot);
  await new Promise((resolve) => window.requestAnimationFrame(resolve));

  const canvas = await window.html2canvas(refs.posterRoot, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });

  const { jsPDF } = window.jspdf;
  const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${snapshot.username}-github-journey-poster.pdf`);
}

function toggleTerminalMode() {
  const enabled = document.body.classList.toggle("terminal-mode");
  setStatus(enabled ? "Terminal mode enabled." : "Terminal mode disabled.");
}

function setupControls() {
  if (refs.periodSwitch) {
    refs.periodSwitch.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-period]");
      if (!button) return;

      state.selectedPeriod = Number(button.dataset.period) || 30;
      refs.periodSwitch.querySelectorAll("button").forEach((node) => {
        node.classList.toggle("active", node === button);
      });

      renderHeatmap();
      renderMilestones();
    });
  }

  if (refs.eventFilter) {
    refs.eventFilter.addEventListener("change", () => {
      state.selectedEventType = refs.eventFilter.value || "all";
      renderHeatmap();
      renderEventBreakdown();
      renderSparkline();
      renderMomentum();
      renderActivity();
      renderMilestones();
    });
  }

  if (refs.repoSearch) refs.repoSearch.addEventListener("input", () => renderReposWithFilters(true));
  if (refs.repoSort) refs.repoSort.addEventListener("change", () => renderReposWithFilters(true));
  if (refs.repoHideForks) refs.repoHideForks.addEventListener("change", () => renderReposWithFilters(true));

  if (refs.repoPrevButton) {
    refs.repoPrevButton.addEventListener("click", () => {
      state.currentRepoPage -= 1;
      renderReposWithFilters();
    });
  }

  if (refs.repoNextButton) {
    refs.repoNextButton.addEventListener("click", () => {
      state.currentRepoPage += 1;
      renderReposWithFilters();
    });
  }

  if (refs.exportJsonButton) refs.exportJsonButton.addEventListener("click", exportSnapshotJson);
  if (refs.exportPngButton) refs.exportPngButton.addEventListener("click", exportPosterPng);
  if (refs.exportPdfButton) refs.exportPdfButton.addEventListener("click", exportPosterPdf);
  if (refs.copySummaryButton) refs.copySummaryButton.addEventListener("click", copySummaryToClipboard);

  if (refs.compareForm && refs.compareLeftInput && refs.compareRightInput) {
    refs.compareForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const left = refs.compareLeftInput.value.trim();
      const right = refs.compareRightInput.value.trim();
      if (!left || !right || !refs.compareResults) {
        if (refs.compareResults) refs.compareResults.innerHTML = "<p>Enter both usernames to compare.</p>";
        return;
      }

      refs.compareResults.innerHTML = "<p>Comparing developers...</p>";

      try {
        const [leftData, rightData] = await Promise.all([
          fetchDashboardData(left),
          fetchDashboardData(right),
        ]);

        const metricMap = [
          ["Total Stars", (dash) => dash.repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)],
          ["Total Forks", (dash) => dash.repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0)],
          ["Public Repositories", (dash) => dash.user.public_repos || 0],
          ["Followers", (dash) => dash.user.followers || 0],
          ["Recent Push Events", (dash) => dash.events.filter((e) => e.type === "PushEvent").length],
        ];

        refs.compareResults.innerHTML = metricMap
          .map(([label, getter]) => {
            const leftValue = getter(leftData);
            const rightValue = getter(rightData);
            const winner = leftValue === rightValue ? "Tie" : leftValue > rightValue ? `${leftData.user.login} leads` : `${rightData.user.login} leads`;
            return `
              <div class="compare-row">
                <span><strong>${leftData.user.login}</strong>: ${numberFmt.format(leftValue)}</span>
                <span class="compare-pill">${label} • ${winner}</span>
                <span><strong>${rightData.user.login}</strong>: ${numberFmt.format(rightValue)}</span>
              </div>
            `;
          })
          .join("");

        refs.compareResults.querySelectorAll(".compare-row").forEach((row, index) => {
          markReveal(row, index * 80);
        });
      } catch (error) {
        refs.compareResults.innerHTML = `<p>${error.message}</p>`;
      }
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "t") {
      event.preventDefault();
      toggleTerminalMode();
    }
  });
}

async function loadDashboard(username) {
  const sanitized = String(username || "").trim();
  if (!sanitized) {
    setStatus("Enter a GitHub username.", true);
    return;
  }

  if (sanitized.toLowerCase() === "terminal") {
    toggleTerminalMode();
    return;
  }

  setStatus(`Loading @${sanitized}...`);
  if (refs.headline) {
    refs.headline.textContent = `Analyzing @${sanitized}'s development journey across repositories and activity.`;
  }

  try {
    const data = await fetchDashboardData(sanitized);

    state.currentUser = data.user;
    state.currentRepos = data.repos;
    state.currentEvents = data.events;
    state.currentRepoPage = 1;

    if (refs.compareLeftInput && !refs.compareLeftInput.value) refs.compareLeftInput.value = sanitized;
    if (refs.compareRightInput && !refs.compareRightInput.value) refs.compareRightInput.value = "gaearon";

    renderAll();

    if (!data.events.length) {
      showNoDataMessage(sanitized);
    } else {
      const first = data.events[0];
      setStatus(
        `Loaded @${sanitized}. Latest activity: ${formatEventTypeName(first.type)} in ${
          first.repo?.name || "unknown/repo"
        } on ${dateFmt.format(new Date(first.created_at))}`
      );
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

function initialize() {
  initializeRevealBase();
  setupControls();

  if (refs.form && refs.usernameInput) {
    refs.form.addEventListener("submit", (event) => {
      event.preventDefault();
      loadDashboard(refs.usernameInput.value);
    });
  }

  loadDashboard(refs.usernameInput ? refs.usernameInput.value : "torvalds");
}

window.addEventListener("error", () => {
  document.querySelectorAll(".reveal.reveal-pending").forEach((node) => {
    node.classList.remove("reveal-pending");
    node.classList.add("active");
  });
});

initialize();
