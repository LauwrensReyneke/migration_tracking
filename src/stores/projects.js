import { defineStore } from 'pinia';
import { formatISO, addDays, addBusinessDays, differenceInBusinessDays, parseISO, isBefore, isWeekend, startOfMonth } from 'date-fns';
import { writeSnapshot } from '../utils/sqlite';
import { buildSnapshot } from '../utils/export';

// Pipeline stages in order
export const STAGES = [
  'planning',
  'template_build',
  'review',
  'final_updates',
  'production',
  'canceled'
];

export const STAGE_LABELS = {
  planning: 'Planning',
  template_build: 'Template',
  review: 'Review',
  final_updates: 'Final Updates',
  production: 'Production',
  canceled: 'Canceled'
};

let _id = 1;
const newId = () => _id++;

// Removed JSON localStorage persistence to use SQLite only

const DEFAULT_DEVS = ['Angeliki','Bongi','Jason','Kopo'];

export const useProjectsStore = defineStore('projects', {
  state: () => {
    // Always start with defaults; hydration comes from SQLite snapshot in main.js
    _id = 1;
    return {
      projects: [],
      developers: DEFAULT_DEVS.slice(),
      wipLimits: {},
      stageWipLimits: {}, // new: per-stage WIP limits (number; omit/NaN => unlimited)
      targetAllCompletionDate: formatISO(addDays(new Date(), 30)).slice(0,10) // yyyy-mm-dd
    };
  },
  getters: {
    totalCount: (s) => s.projects.length,
    completedCount: (s) => s.projects.filter(p => p.stage === 'production').length,
    completionRatio() { return this.totalCount ? this.completedCount / this.totalCount : 0; },
    activeProjects: (s) => s.projects.filter(p => p.stage !== 'production' && p.stage !== 'canceled'),
    workloadByDev: (s) => {
      const map = {};
      s.developers.forEach(d => map[d] = 0);
      // count only assigned to known devs; keep unassigned out of per-dev load
      s.projects.forEach(p => {
        if (p.stage === 'production' || p.stage === 'canceled') return;
        if (p.assignedDev && Object.prototype.hasOwnProperty.call(map, p.assignedDev)) {
          map[p.assignedDev] = (map[p.assignedDev]||0)+1;
        }
      });
      return map;
    },
    devStats: (s) => {
      const stats = {};
      s.developers.forEach(dev => {
        const all = s.projects.filter(p => p.assignedDev === dev);
        const active = all.filter(p => p.stage !== 'production' && p.stage !== 'canceled');
        const completed = all.filter(p => p.stage === 'production');
        const cycles = completed.filter(p => p.startedAt && p.completedAt).map(p => differenceInBusinessDays(parseISO(p.completedAt), parseISO(p.startedAt)));
        const avgCycle = cycles.length ? +(cycles.reduce((a,b)=>a+b,0)/cycles.length).toFixed(2) : 0;
        let throughput = 0;
        if (completed.length) {
          const firstStart = completed.reduce((earliest, p) => {
            const d = parseISO(p.startedAt || p.createdAt);
            return !earliest || isBefore(d, earliest) ? d : earliest;
          }, null);
          const days = Math.max(differenceInBusinessDays(new Date(), firstStart), 1);
          throughput = +(completed.length / days).toFixed(3);
        }
        const onTimeCompleted = completed.filter(p => {
          if (!p.completedAt) return false;
          const start = parseISO(p.startedAt || p.createdAt);
          const expected = addBusinessDays(start, p.targetDays || 4);
          return !isBefore(expected, parseISO(p.completedAt));
        }).length;
        const onTimeRate = completed.length ? +((onTimeCompleted / completed.length) * 100).toFixed(0) : null;
        stats[dev] = { active: active.length, completed: completed.length, avgCycle, throughput, onTime: onTimeCompleted, onTimeRate };
      });
      return stats;
    },
    // New: per-developer stats for this calendar month
    devStatsThisMonth: (s) => {
      const today = new Date();
      const windowStart = startOfMonth(today);
      return computeDevWindowStats(s.projects, s.developers, windowStart, today);
    },
    // New: per-developer stats for the last 7 calendar days (inclusive of today)
    devStatsLast7Days: (s) => {
      const today = new Date();
      const windowStart = addDays(today, -6);
      return computeDevWindowStats(s.projects, s.developers, windowStart, today);
    },
    mvpDev() {
      // pick by highest throughput, then most completed, then lowest avgCycle
      const stats = this.devStats;
      const devs = Object.keys(stats);
      if (!devs.length) return null;
      devs.sort((a,b) => {
        const A = stats[a], B = stats[b];
        if (B.throughput !== A.throughput) return B.throughput - A.throughput;
        if (B.completed !== A.completed) return B.completed - A.completed;
        return A.avgCycle - B.avgCycle;
      });
      return devs[0];
    },
    mvpDevThisMonth(s) {
      const today = new Date();
      const windowStart = startOfMonth(today);
      const stats = computeDevWindowStats(s.projects, s.developers, windowStart, today);
      const devs = Object.keys(stats);
      if (!devs.length) return null;
      // If nobody completed anything in the window, return null (no MVP)
      const maxThroughput = Math.max(...devs.map(d => stats[d].throughput));
      const maxCompleted = Math.max(...devs.map(d => stats[d].completed));
      if (maxThroughput === 0 && maxCompleted === 0) return null;
      const ordered = devs.sort((a,b) => {
        const A = stats[a], B = stats[b];
        if (B.throughput !== A.throughput) return B.throughput - A.throughput;
        if (B.completed !== A.completed) return B.completed - A.completed;
        const aAvg = A.avgCycle === null ? Infinity : A.avgCycle;
        const bAvg = B.avgCycle === null ? Infinity : B.avgCycle;
        if (aAvg !== bAvg) return aAvg - bAvg; // lower avgCycle better
        if ((B.active||0) !== (A.active||0)) return (B.active||0) - (A.active||0);
        return a.localeCompare(b);
      });
      return ordered[0] || null;
    },
    mvpDevLast7Days(s) {
      const today = new Date();
      const windowStart = addDays(today, -6); // include today => 7 calendar days
      const stats = computeDevWindowStats(s.projects, s.developers, windowStart, today);
      const devs = Object.keys(stats);
      if (!devs.length) return null;
      const maxThroughput = Math.max(...devs.map(d => stats[d].throughput));
      const maxCompleted = Math.max(...devs.map(d => stats[d].completed));
      if (maxThroughput === 0 && maxCompleted === 0) return null;
      const ordered = devs.sort((a,b) => {
        const A = stats[a], B = stats[b];
        if (B.throughput !== A.throughput) return B.throughput - A.throughput;
        if (B.completed !== A.completed) return B.completed - A.completed;
        const aAvg = A.avgCycle === null ? Infinity : A.avgCycle;
        const bAvg = B.avgCycle === null ? Infinity : B.avgCycle;
        if (aAvg !== bAvg) return aAvg - bAvg;
        if ((B.active||0) !== (A.active||0)) return (B.active||0) - (A.active||0);
        return a.localeCompare(b);
      });
      return ordered[0] || null;
    },
    velocityData: (s) => {
      // cumulative completed per day (exclude canceled)
      const todayStr = formatISO(new Date()).slice(0,10);
      const done = s.projects.filter(p => p.stage === 'production');
      const pointsMap = {};
      done.forEach(p => {
        const day = (p.completedAt ? p.completedAt.slice(0,10) : todayStr);
        pointsMap[day] = (pointsMap[day]||0) + 1;
      });
      const days = Object.keys(pointsMap).sort();
      let cumulative = 0;
      const result = days.map(d => { cumulative += pointsMap[d]; return { date: d, value: cumulative }; });
      return result;
    },
    idealVelocity: (s) => {
      const nonCanceled = s.projects.filter(p => p.stage !== 'canceled');
      if (!nonCanceled.length) return [];
      const total = nonCanceled.length;
      const start = nonCanceled.reduce((earliest, p) => isBefore(parseISO(p.createdAt), earliest) ? parseISO(p.createdAt) : earliest, parseISO(nonCanceled[0].createdAt));
      const end = parseISO(s.targetAllCompletionDate);
      const businessDays = Math.max(differenceInBusinessDays(end, start), 1);
      const arr = [];
      for (let i=0;i<=businessDays;i++) {
        const d = formatISO(addBusinessDays(start, i)).slice(0,10);
        arr.push({ date: d, value: +(total * (i/businessDays)).toFixed(2) });
      }
      return arr;
    },
    averageCycleDays: (s) => {
      const done = s.projects.filter(p => p.startedAt && p.completedAt && p.stage === 'production');
      if (!done.length) return 0;
      const total = done.reduce((acc, p) => acc + differenceInBusinessDays(parseISO(p.completedAt), parseISO(p.startedAt)), 0);
      return +(total / done.length).toFixed(2);
    },
    throughputPerBusinessDay: (s) => {
      // Only consider migrations
      const done = s.projects.filter(p => p.stage === 'production' && p.type === 'migration');
      if (!done.length) return 0;
      const firstStart = done.reduce((earliest, p) => {
        const d = parseISO(p.startedAt || p.createdAt);
        return isBefore(d, earliest) ? d : earliest;
      }, parseISO(done[0].startedAt || done[0].createdAt));
      const days = Math.max(differenceInBusinessDays(new Date(), firstStart), 1);
      return +(done.length / days).toFixed(3);
    },
    remainingCount: (s) => s.projects.filter(p => p.type === 'migration' && p.stage !== 'production' && p.stage !== 'canceled').length,
    forecastCompletionDate() {
      // Only consider migrations
      if (!this.remainingCount) return this.targetAllCompletionDate; // nothing remaining
      if (!this.throughputPerBusinessDay) return null; // insufficient data
      const remaining = this.remainingCount;
      const neededBusinessDays = Math.ceil(remaining / this.throughputPerBusinessDay);
      let date = new Date();
      let added = 0;
      while (added < neededBusinessDays) {
        date = addDays(date, 1);
        if (!isWeekend(date)) added++;
      }
      return formatISO(date).slice(0,10);
    },
    requiredVelocityToHitTarget() {
      // Only consider migrations
      const remaining = this.remainingCount;
      if (!remaining) return 0;
      const today = new Date();
      const target = parseISO(this.targetAllCompletionDate);
      const daysLeft = differenceInBusinessDays(target, today);
      if (daysLeft <= 0) return Infinity;
      return +(remaining / daysLeft).toFixed(3);
    },
    isTargetRisk() {
      // Only consider migrations
      if (!this.remainingCount) return false;
      if (!this.forecastCompletionDate) return true; // cannot forecast yet => flag risk
      return isBefore(parseISO(this.targetAllCompletionDate), parseISO(this.forecastCompletionDate));
    },
    burnDownData: (s) => {
      // Only consider migrations
      const all = s.projects.filter(p => p.type === 'migration');
      if (!all.length) return { labels: [], actual: [], ideal: [], idealAbsolute: [], forecast: [], today: new Date().toISOString().slice(0,10), targetDate: s.targetAllCompletionDate, forecastDate: null };
      const nonCanceled = all.filter(p => p.stage !== 'canceled');
      const total = nonCanceled.length;
      const today = new Date();
      const todayStr = formatISO(today).slice(0,10);
      const completionsByDay = {};
      all.forEach(p => {
        if (p.stage === 'production') {
          if (p.completedAt) {
            const d = p.completedAt.slice(0,10);
            completionsByDay[d] = (completionsByDay[d]||0) + 1;
          } else {
            completionsByDay[todayStr] = (completionsByDay[todayStr]||0) + 1;
          }
        } else if (p.stage === 'canceled') {
          const d = (p.completedAt ? p.completedAt.slice(0,10) : todayStr);
          completionsByDay[d] = (completionsByDay[d]||0) + 1;
        }
      });
      const firstDateISO = nonCanceled.length ? nonCanceled.reduce((earliest, p) => !earliest || p.createdAt < earliest ? p.createdAt : earliest, nonCanceled[0].createdAt) : all[0].createdAt;
      const completionDays = Object.keys(completionsByDay).sort();
      const startDate = completionDays.length ? parseISO(completionDays[0]) : parseISO(firstDateISO);
      const lastRelevant = parseISO(s.targetAllCompletionDate);
      const labels = []; let cursor = new Date(startDate);
      while (!isBefore(lastRelevant, cursor)) { labels.push(formatISO(cursor).slice(0,10)); cursor = addDays(cursor,1); }
      let cumulative = 0; const actual = labels.map(d => { cumulative += (completionsByDay[d]||0); return total - cumulative; });
      // compute current remaining as of today (used by ideal anchored and forecast)
      const produced = all.filter(p => p.stage === 'production').length;
      let remaining = total - produced;
      // Ideal (anchored from today to target over business days; null before today)
      const totalBizDaysForward = Math.max(differenceInBusinessDays(lastRelevant, today), 1);
      const ideal = labels.map(d => {
        const dateObj = parseISO(d + 'T00:00:00');
        if (isBefore(dateObj, today)) return null;
        const idx = Math.min(Math.max(differenceInBusinessDays(dateObj, today), 0), totalBizDaysForward);
        return +(remaining * (1 - idx/totalBizDaysForward)).toFixed(2);
      });
      // Ideal absolute (from earliest start to target over business days; covers entire range)
      const totalBizDaysAbs = Math.max(differenceInBusinessDays(lastRelevant, startDate), 1);
      const idealAbsolute = labels.map(d => {
        const idx = Math.min(Math.max(differenceInBusinessDays(parseISO(d), startDate), 0), totalBizDaysAbs);
        return +(total * (1 - idx/totalBizDaysAbs)).toFixed(2);
      });
      // compute throughput per business day for forecast (production only)
      let throughput = 0; const doneProd = all.filter(p => p.stage === 'production');
      if (doneProd.length){
        const firstStartISO = doneProd.reduce((earliest, p) => !earliest || (p.startedAt||p.createdAt) < earliest ? (p.startedAt||p.createdAt) : earliest, doneProd[0].startedAt||doneProd[0].createdAt);
        const days = Math.max(differenceInBusinessDays(today, parseISO(firstStartISO)),1);
        throughput = doneProd.length / days;
      }
      const forecast = labels.map(d => {
        const dateObj = parseISO(d + 'T00:00:00');
        if (isBefore(dateObj, today)) return null; // no forecast in the past
        if (d === todayStr) return +remaining.toFixed(2); // start at current remaining today
        if (!isWeekend(dateObj)) remaining = Math.max(0, remaining - throughput);
        return +remaining.toFixed(2);
      });
      // derive forecast date when forecast reaches zero
      let forecastDate = null;
      for (let i=0;i<labels.length;i++){
        const y = forecast[i];
        if (typeof y === 'number' && y <= 0) { forecastDate = labels[i]; break; }
      }
      return { labels, actual, ideal, idealAbsolute, forecast, today: todayStr, targetDate: s.targetAllCompletionDate, forecastDate };
    }
  },
  actions: {
    persistNow() {
      try { writeSnapshot(buildSnapshot(this)); } catch {}
    },
    hydrateFromSnapshot(snap) {
      const developers = Array.isArray(snap.developers) ? snap.developers.slice() : [];
      const wipLimits = {};
      developers.forEach(d => { if (typeof snap.wipLimits?.[d] === 'number') wipLimits[d] = snap.wipLimits[d]; });
      const stageWipLimits = {};
      if (snap.stageWipLimits && typeof snap.stageWipLimits === 'object') {
        STAGES.forEach(s => {
          const v = snap.stageWipLimits[s];
          if (typeof v === 'number' && !Number.isNaN(v)) stageWipLimits[s] = v;
        });
      }
      const projects = Array.isArray(snap.projects) ? snap.projects.map(p => ({ ...p })) : [];
      this.developers = developers;
      this.wipLimits = wipLimits;
      this.stageWipLimits = stageWipLimits;
      this.projects = projects;
      this.targetAllCompletionDate = snap.targetAllCompletionDate || this.targetAllCompletionDate;
      const maxId = this.projects.reduce((m, p) => typeof p.id === 'number' && p.id > m ? p.id : m, 0);
      _id = maxId + 1;
    },
    advanceStage(id) {
      const p = this.projects.find(p => p.id === id);
      if (!p) return;
     if (p.stage === 'production' || p.stage === 'canceled') return; // already terminal
      const idx = STAGES.indexOf(p.stage);
      if (idx === -1) return;
      if (idx < STAGES.length -1) {
        const next = STAGES[idx+1];
        if (p.stage === 'planning' && !p.startedAt) p.startedAt = formatISO(new Date());
        p.stage = next;
        if (next === 'production' || next === 'canceled') p.completedAt = formatISO(new Date());
      }
      this.persistNow();
    },
    moveToStage(id, stage) {
      const p = this.projects.find(p => p.id === id);
      if (!p) return;
      if (!STAGES.includes(stage)) return;
      const prev = p.stage;
      if (prev === stage) return;
      // set startedAt if leaving planning
      if (prev === 'planning' && stage !== 'planning' && !p.startedAt) p.startedAt = formatISO(new Date());
      p.stage = stage;
      if (stage === 'production' || stage === 'canceled') {
        if (!p.completedAt) p.completedAt = formatISO(new Date());
      } else if (p.completedAt) {
        // moving back out of terminal stages clears completion timestamp
        p.completedAt = null;
      }
      this.persistNow();
    },
    addProject(data) {
      const startedAt = data.startedAt || null;
      const completedAt = data.completedAt || null;
      let stage = 'planning';
      if (completedAt) stage = 'production';
      else if (startedAt) stage = 'template_build';
      const id = newId();
      this.projects.push({
        id,
        name: data.name,
        type: data.type,
        stage,
        createdAt: formatISO(new Date()),
        startedAt,
        targetDays: data.targetDays || 4,
        assignedDev: data.assignedDev || '',
        completedAt
      });
      this.persistNow();
      return id;
    },
    updateProject(id, patch) {
      const idx = this.projects.findIndex(p => p.id === id);
      if (idx === -1) return;
      const p = this.projects[idx];
      Object.assign(p, patch);
      // normalize unassigned as empty string
      if (!p.assignedDev) p.assignedDev = '';
      // If stage was edited directly ensure invariants
      if ((p.stage === 'production' || p.stage === 'canceled') && !p.completedAt) p.completedAt = formatISO(new Date());
      if (p.stage !== 'production' && p.stage !== 'canceled' && p.completedAt) p.completedAt = null;
      if (p.stage !== 'planning' && !p.startedAt) p.startedAt = formatISO(new Date());
      this.persistNow();
    },
    deleteProject(id) {
      const before = this.projects.length;
      this.projects = this.projects.filter(p => p.id !== id);
      if (this.projects.length !== before) {
        this.persistNow();
      }
    },
    setTargetDate(dateStr) { this.targetAllCompletionDate = dateStr; this.persistNow(); },
    setWipLimit(dev, limit) {
      if (!this.developers.includes(dev)) return;
      this.wipLimits[dev] = Math.max(0, Number(limit)||0);
      this.persistNow();
    },
    setStageWipLimit(stage, limit) {
      if (!STAGES.includes(stage)) return;
      const n = Number(limit);
      if (!Number.isFinite(n) || n <= 0) {
        // treat null/<=0 as unlimited: remove explicit limit
        if (this.stageWipLimits && Object.prototype.hasOwnProperty.call(this.stageWipLimits, stage)) {
          delete this.stageWipLimits[stage];
        }
      } else {
        if (!this.stageWipLimits) this.stageWipLimits = {};
        this.stageWipLimits[stage] = Math.floor(n);
      }
      this.persistNow();
    },
    // Developers management
    addDeveloper(name) {
      const n = (name || '').trim();
      if (!n) return false;
      if (this.developers.includes(n)) return false;
      this.developers.push(n);
      this.persistNow();
      return true;
    },
    renameDeveloper(oldName, newName) {
      const from = (oldName||'').trim();
      const to = (newName||'').trim();
      if (!from || !to) return false;
      const idx = this.developers.findIndex(d => d === from);
      if (idx === -1) return false;
      if (this.developers.includes(to)) return false; // avoid duplicates
      this.developers.splice(idx, 1, to);
      // update projects assignment (all, including completed) to keep continuity
      this.projects.forEach(p => { if (p.assignedDev === from) p.assignedDev = to; });
      // move wip limit mapping if exists
      if (Object.prototype.hasOwnProperty.call(this.wipLimits, from)) {
        this.wipLimits[to] = this.wipLimits[from];
        delete this.wipLimits[from];
      }
      this.persistNow();
      return true;
    },
    removeDeveloper(name, reassignTo) {
      const n = (name||'').trim();
      if (!n) return false;
      const idx = this.developers.findIndex(d => d === n);
      if (idx === -1) return false;
      if (this.developers.length <= 1) return false; // cannot remove last dev
      const replacement = (reassignTo||'').trim();
      const hasActive = this.projects.some(p => p.assignedDev === n && p.stage !== 'production' && p.stage !== 'canceled');
      if (hasActive) {
        if (!replacement || !this.developers.includes(replacement) || replacement === n) return false;
        this.projects.forEach(p => {
          if (p.assignedDev === n && p.stage !== 'production' && p.stage !== 'canceled') p.assignedDev = replacement;
        });
      }
      // finally remove from developers
      this.developers.splice(idx, 1);
      if (Object.prototype.hasOwnProperty.call(this.wipLimits, n)) delete this.wipLimits[n];
      this.persistNow();
      return true;
    }
  }
});

// Helper: compute per-developer stats for a given inclusive window [windowStart, windowEnd]
function computeDevWindowStats(projects, developers, windowStart, windowEnd) {
  const stats = {};
  developers.forEach(dev => {
    const all = projects.filter(p => p.assignedDev === dev);
    const active = all.filter(p => p.stage !== 'production' && p.stage !== 'canceled');
    const completedInWindow = all.filter(p => {
      if (p.stage !== 'production') return false;
      const completedAt = p.completedAt ? parseISO(p.completedAt) : windowEnd; // treat missing completedAt as completed on windowEnd
      return !isBefore(completedAt, windowStart) && !isBefore(windowEnd, completedAt); // windowStart <= completedAt <= windowEnd
    });
    const completedCount = completedInWindow.length;
    // use business days between windowStart and windowEnd as denominator (at least 1)
    const bdays = Math.max(differenceInBusinessDays(windowEnd, windowStart), 1);
    const throughput = +(completedCount / bdays).toFixed(3);
    const cycles = completedInWindow.filter(p => p.startedAt && p.completedAt)
      .map(p => differenceInBusinessDays(parseISO(p.completedAt), parseISO(p.startedAt)));
    const avgCycle = cycles.length ? +(cycles.reduce((a,b)=>a+b,0)/cycles.length).toFixed(2) : null;
    const onTimeCompleted = completedInWindow.filter(p => {
      const start = parseISO(p.startedAt || p.createdAt);
      const expected = addBusinessDays(start, p.targetDays || 4);
      const completedAt = p.completedAt ? parseISO(p.completedAt) : windowEnd;
      return !isBefore(expected, completedAt);
    }).length;
    const onTimeRate = completedCount ? +((onTimeCompleted / completedCount) * 100).toFixed(0) : null;
    stats[dev] = { active: active.length, completed: completedCount, throughput, avgCycle, onTimeRate };
  });
  return stats;
}
