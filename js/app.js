/* Theme Toggle */
(function () {
  const html = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme-pref');
  if (saved === 'dark') {
    html.setAttribute('data-theme', 'dark');
    btn.textContent = 'Light Mode';
  }
  btn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme-pref', next);
    btn.textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
    if (window.drawAdapaleneChart) window.drawAdapaleneChart();
  });
})();

/* Fixed Header Behavior */
(function () {
  const header = document.getElementById('siteHeader');
  const nav = document.getElementById('topNav');
  let lastScroll = 0;

  function updateSpace() {
    const h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--dynamic-header-space', (h + 10) + 'px');
  }

  function updateActiveLink() {
    const sections = [...document.querySelectorAll('main section[id]')];
    const scrollPos = window.scrollY + header.offsetHeight + 40;
    let current = null;
    for (const sec of sections) {
      if (sec.offsetTop <= scrollPos) current = sec.id;
    }
    if (current) {
      [...nav.querySelectorAll('a')].forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
    }
  }

  function onScroll() {
    const y = window.scrollY;
    if (y > 90) header.classList.add('compact'); else header.classList.remove('compact');
    if (y > lastScroll && y > 300) header.classList.add('hide-bar');
    else header.classList.remove('hide-bar');
    lastScroll = y;
    updateActiveLink();
    updateSpace();
  }

  window.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('resize', updateSpace);
  updateSpace();
  setTimeout(updateActiveLink, 350);
})();

/* Tracker / Log / Chart (with collapsible daily table) */
(function () {
  const tableBody = document.getElementById('trackerBody');
  if (!tableBody) return;
  const wrap = document.getElementById('dailyTableWrap');
  const ghost = document.getElementById('dailyTableGhost');
  const toggleBtn = document.getElementById('toggleDailyTable');
  const collapseKey = 'acne-hide-daily-table-v1.0.1';

  const storageKey = 'acne-daily-tracker-v1.0.1';
  const quickNoteKeyPrefix = 'acne-quicknote-day-';
  const startDateKey = 'acne-calendar-start';

  const currentDayInput = document.getElementById('trkCurrentDay');
  const btnTodayAda = document.getElementById('trkTodayAda');
  const btnClear = document.getElementById('trkClear');
  const btnExport = document.getElementById('trkExport');
  const btnImport = document.getElementById('trkImport');
  const btnFillWeek = document.getElementById('trkFillWeek');
  const btnCSV = document.getElementById('trkExportCSV');
  const btnLogCSV = document.getElementById('trkExportLogCSV');
  const btnChartPNG = document.getElementById('trkChartPNG');
  const calendarStart = document.getElementById('calendarStart');
  const toggleCalendar = document.getElementById('toggleCalendar');
  const calendarPanel = document.getElementById('calendarPanel');
  const calendarGrid = document.getElementById('calendarGrid');
  const trackerTable = document.getElementById('trackerTable');

  const adaLogTable = document.getElementById('adaLogTable');
  const adaSummary = document.getElementById('adaSummary');

  // Metrics
  const mTotal = document.getElementById('mTotal');
  const mAvg = document.getElementById('mAvg');
  const mStreak = document.getElementById('mStreak');
  const mLastRest = document.getElementById('mLastRest');
  const mTodayHint = document.getElementById('mTodayHint');

  // Quick Note Modal
  const qModal = document.getElementById('quickNoteModal');
  const qneDay = document.getElementById('qneDay');
  const qneText = document.getElementById('qneText');
  const qneSave = document.getElementById('qneSave');
  const qneDelete = document.getElementById('qneDelete');
  const qneClose = document.getElementById('qneClose');
  let qneCurrentDay = null;

  // Chart
  const chartCanvas = document.getElementById('adaChart');
  const ctx = chartCanvas.getContext('2d');

  /* Collapse state init */
  function applyCollapseState() {
    const hidden = localStorage.getItem(collapseKey) === '1';
    wrap.classList.toggle('collapsed', hidden);
    if (hidden) {
      toggleBtn.textContent = 'Hiện bảng 30 ngày';
      toggleBtn.classList.add('secondary');
      toggleBtn.classList.remove('alt');
    } else {
      toggleBtn.textContent = 'Ẩn bảng 30 ngày';
      toggleBtn.classList.add('alt');
      toggleBtn.classList.remove('secondary');
    }
  }

  applyCollapseState();
  toggleBtn.addEventListener('click', () => {
    const hidden = wrap.classList.toggle('collapsed');
    localStorage.setItem(collapseKey, hidden ? '1' : '0');
    applyCollapseState();
  });

  function defaultData() {
    const o = {};
    for (let d = 1; d <= 30; d++) o[d] = {m: 0, e: 0, bpo: 0, ada: 0};
    return o;
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (let d = 1; d <= 30; d++) {
          if (!parsed[d]) parsed[d] = {m: 0, e: 0, bpo: 0, ada: 0};
          ['m', 'e', 'bpo', 'ada'].forEach(k => {
            if (typeof parsed[d][k] !== 'number') parsed[d][k] = 0;
          });
        }
        return parsed;
      }
    } catch (e) {
    }
    return defaultData();
  }

  let data = loadData();

  function saveData() {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  function quickNoteKey(day) {
    return quickNoteKeyPrefix + day;
  }

  function getQuickNote(day) {
    return localStorage.getItem(quickNoteKey(day)) || '';
  }

  function setQuickNote(day, val) {
    if (val && val.trim()) localStorage.setItem(quickNoteKey(day), val.trim());
    else localStorage.removeItem(quickNoteKey(day));
  }

  function getStartDate() {
    const v = localStorage.getItem(startDateKey);
    return v ? new Date(v) : null;
  }

  function setStartDate(ds) {
    ds ? localStorage.setItem(startDateKey, ds) : localStorage.removeItem(startDateKey);
  }

  function formatRealDate(dayIndex) {
    const sd = getStartDate();
    if (!sd) return '';
    const d = new Date(sd.getTime() + (dayIndex - 1) * 86400000);
    return d.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
  }

  function renderRows() {
    tableBody.innerHTML = '';
    for (let d = 1; d <= 30; d++) {
      const tr = document.createElement('tr');
      const dayTd = document.createElement('td');
      dayTd.className = 'day-col';
      const realDate = formatRealDate(d);
      dayTd.innerHTML = `
            <div class="day-pod">
              <span class="day-number">${d}</span>
              <span class="day-realdate">${realDate || ''}</span>
              <span class="quick-note-icon ${getQuickNote(d) ? 'has-note' : ''}" data-day="${d}" title="Quick Note ${d}${getQuickNote(d) ? ': ' + getQuickNote(d) : ''}">✎</span>
            </div>`;
      tr.appendChild(dayTd);
      ['m', 'e', 'bpo', 'ada'].forEach(t => {
        const td = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'trk-cell';
        btn.setAttribute('role', 'checkbox');
        btn.setAttribute('aria-checked', data[d][t] ? 'true' : 'false');
        btn.dataset.day = d;
        btn.dataset.type = t;
        btn.textContent = {m: 'AM', e: 'PM', bpo: 'BPO', ada: 'ADA'}[t];
        td.appendChild(btn);
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    }
    renderCalendar();
    if (window.updateNotesRealDateDisplay) window.updateNotesRealDateDisplay();
  }

  trackerTable.addEventListener('click', e => {
    const noteIcon = e.target.closest('.quick-note-icon');
    if (noteIcon) {
      openQuickNoteModal(+noteIcon.dataset.day);
      return;
    }
    const btn = e.target.closest('.trk-cell');
    if (!btn) return;
    const d = +btn.dataset.day, t = btn.dataset.type;
    data[d][t] = data[d][t] ? 0 : 1;
    btn.setAttribute('aria-checked', data[d][t] ? 'true' : 'false');
    saveData();
    if (t === 'ada') updateExperiencedLog();
    updateMetrics();
    renderCalendar();
    drawAdapaleneChart();
  });

  btnTodayAda.addEventListener('click', () => {
    const day = +currentDayInput.value;
    if (day < 1 || day > 30) return;
    data[day].ada = 1;
    if (!data[day].e) data[day].e = 1;
    saveData();
    renderRows();
    updateExperiencedLog();
    updateMetrics();
    highlightWeek(day);
    drawAdapaleneChart();
  });

  currentDayInput.addEventListener('change', () => {
    let v = +currentDayInput.value;
    if (v < 1) v = 1;
    if (v > 30) v = 30;
    currentDayInput.value = v;
    highlightWeek(v);
    updateMetrics();
    if (window.setNotesDay) window.setNotesDay(v, false);
  });

  btnClear.addEventListener('click', () => {
    if (!confirm('Xóa toàn bộ dữ liệu 30 ngày & quick notes?')) return;
    data = defaultData();
    for (let d = 1; d <= 30; d++) setQuickNote(d, '');
    saveData();
    renderRows();
    updateExperiencedLog();
    updateMetrics();
    drawAdapaleneChart();
  });

  function pickFile(accept, cb) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.onchange = () => {
      if (!inp.files[0]) return;
      const fr = new FileReader();
      fr.onload = () => cb(fr.result);
      fr.readAsText(inp.files[0]);
    };
    inp.click();
  }

  function downloadFile(content, name, type) {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  btnExport.addEventListener('click', () => {
    const exportObj = {tracker: data, quickNotes: {}, startDate: localStorage.getItem(startDateKey) || null};
    for (let d = 1; d <= 30; d++) {
      const q = getQuickNote(d);
      if (q) exportObj.quickNotes[d] = q;
    }
    downloadFile(JSON.stringify(exportObj, null, 2), 'acne-tracker-export.json', 'application/json');
  });

  btnImport.addEventListener('click', () => pickFile('application/json', file => {
    try {
      const obj = JSON.parse(file);
      if (obj.tracker) {
        for (let d = 1; d <= 30; d++) {
          if (obj.tracker[d]) ['m', 'e', 'bpo', 'ada'].forEach(k => data[d][k] = obj.tracker[d][k] ? 1 : 0);
        }
      }
      if (obj.quickNotes) {
        for (const k in obj.quickNotes) {
          const day = +k;
          if (day >= 1 && day <= 30) setQuickNote(day, obj.quickNotes[k]);
        }
      }
      if (obj.startDate) {
        setStartDate(obj.startDate);
        calendarStart.value = obj.startDate;
      }
      saveData();
      renderRows();
      updateExperiencedLog();
      updateMetrics();
      drawAdapaleneChart();
    } catch (e) {
      alert('File không hợp lệ');
    }
  }));

  btnFillWeek.addEventListener('click', () => {
    const d = +currentDayInput.value;
    const w = weekOfDay(d);
    const r = weekRange(w);
    if (!confirm('Đề xuất 6 đêm Adapalene tuần ' + w + ' (' + r[0] + '–' + r[1] + ')?')) return;
    autoDistributeWeek(w, 6);
    saveData();
    renderRows();
    updateExperiencedLog();
    updateMetrics();
    highlightWeek(r[0]);
    drawAdapaleneChart();
  });

  btnCSV.addEventListener('click', () => {
    const header = ['Day', 'RealDate', 'Morning', 'Evening', 'BPO', 'Adapalene', 'QuickNote'];
    const rows = [header.join(',')];
    for (let d = 1; d <= 30; d++) {
      rows.push([
        d,
        '"' + formatRealDate(d) + '"',
        data[d].m, data[d].e, data[d].bpo, data[d].ada,
        '"' + (getQuickNote(d).replace(/"/g, '""')) + '"'
      ].join(','));
    }
    downloadFile(rows.join('\\n'), 'tracker.csv', 'text/csv');
  });

  btnLogCSV.addEventListener('click', () => {
    const header = ['Week', 'Range', 'UsedNights', 'RestNights', 'LongestWeekStreak', 'Status', 'GlobalLongestStreak', 'TotalUsed', 'AvgPerWeek'];
    const metrics = computeGlobalMetrics();
    const rows = [header.join(',')];
    for (let w = 1; w <= 5; w++) {
      const info = computeWeekInfo(w);
      rows.push([
        w, weekRangeText(w), info.count, info.rest, info.maxStreak,
        info.statusText, metrics.maxStreak, metrics.total, metrics.avg
      ].join(','));
    }
    downloadFile(rows.join('\\n'), 'log.csv', 'text/csv');
  });

  btnChartPNG.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'adapalene-frequency-chart.png';
    link.href = chartCanvas.toDataURL('image/png');
    link.click();
  });

  toggleCalendar.addEventListener('click', () => {
    const vis = calendarPanel.style.display === 'block';
    calendarPanel.style.display = vis ? 'none' : 'block';
    toggleCalendar.textContent = vis ? 'Hiện Lịch' : 'Ẩn Lịch';
    if (!vis) renderCalendar();
  });

  calendarStart.addEventListener('change', () => {
    calendarStart.value ? setStartDate(calendarStart.value) : setStartDate(null);
    renderRows();
    drawAdapaleneChart();
    if (window.updateNotesRealDateDisplay) window.updateNotesRealDateDisplay();
  });

  (function initStart() {
    const sd = getStartDate();
    if (sd) calendarStart.value = sd.toISOString().slice(0, 10);
  })();

  function renderCalendar() {
    if (calendarPanel.style.display !== 'block') return;
    calendarGrid.innerHTML = '';
    const totalCells = 35;
    for (let i = 0; i < totalCells; i++) {
      const day = i + 1;
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      if (day > 30) {
        cell.classList.add('disabled');
        calendarGrid.appendChild(cell);
        continue;
      }
      const note = getQuickNote(day);
      const real = formatRealDate(day);
      cell.innerHTML = `
            <div class="cal-day-label">
              <span class="cal-day-number">${day}</span>
              <span class="cal-real-date">${real || ''}</span>
            </div>
            <span class="cal-quick-note ${note ? 'has-note' : ''}" data-day="${day}" title="${note ? note : 'Quick Note trống'}">✎</span>
            <div class="cal-tags">${buildCalTags(day)}</div>`;
      cell.dataset.day = day;
      cell.addEventListener('click', (ev) => {
        if (ev.target.classList.contains('cal-quick-note')) {
          openQuickNoteModal(day);
          ev.stopPropagation();
          return;
        }
        currentDayInput.value = day;
        highlightWeek(day);
        updateMetrics();
        if (window.setNotesDay) window.setNotesDay(day, true);
        const row = tableBody.querySelectorAll('tr')[day - 1];
        if (row && !wrap.classList.contains('collapsed')) row.scrollIntoView({behavior: 'smooth', block: 'center'});
      });
      calendarGrid.appendChild(cell);
    }
  }

  function buildCalTags(day) {
    const t = [];
    if (data[day].m) t.push('<span class="cal-tag am">AM</span>');
    if (data[day].e) t.push('<span class="cal-tag pm">PM</span>');
    if (data[day].bpo) t.push('<span class="cal-tag bpo">BPO</span>');
    if (data[day].ada) t.push('<span class="cal-tag ada">ADA</span>');
    return t.join('');
  }

  function weekOfDay(d) {
    return Math.floor((d - 1) / 7) + 1;
  }

  function weekRange(w) {
    if (w === 5) return [29, 30];
    const s = (w - 1) * 7 + 1;
    return [s, s + 6];
  }

  function weekRangeText(w) {
    const r = weekRange(w);
    return r[0] + '-' + r[1];
  }

  function autoDistributeWeek(w, target) {
    const r = weekRange(w);
    const len = r[1] - r[0] + 1;
    for (let d = r[0]; d <= r[1]; d++) data[d].ada = 0;
    const use = Math.min(target, len);
    const step = len / use;
    for (let i = 0; i < use; i++) {
      const day = Math.round(r[0] + i * step);
      if (day >= r[0] && day <= r[1]) data[day].ada = 1;
    }
  }

  function computeWeekInfo(w) {
    const r = weekRange(w);
    let count = 0, rest = 0, streak = 0, maxStreak = 0;
    for (let d = r[0]; d <= r[1]; d++) {
      if (data[d].ada) {
        streak++;
        count++;
        if (streak > maxStreak) maxStreak = streak;
      } else {
        if (streak > maxStreak) maxStreak = streak;
        streak = 0;
        rest++;
      }
    }
    let statusText = '';
    if (w === 5) {
      statusText = count <= 2 ? 'Ổn' : 'Dày';
    } else {
      if (count >= 5 && count <= 6 && rest >= 1 && maxStreak <= 6) statusText = 'Tối ưu';
      else if (count === 7) statusText = 'Không nghỉ';
      else if (count === 4) statusText = 'Hơi thấp';
      else if (count <= 3) statusText = 'Thấp';
      else if (count > 6) statusText = 'Quá cao';
      else statusText = 'Theo dõi';
    }
    return {r, count, rest, maxStreak, statusText};
  }

  function updateExperiencedLog() {
    adaLogTable.querySelectorAll('tbody tr').forEach(row => {
      const w = +row.dataset.week;
      const info = computeWeekInfo(w);
      row.querySelector('.count').textContent = info.count;
      row.querySelector('.rest').textContent = info.rest;
      row.querySelector('.streak').textContent = info.maxStreak;
      const statusCell = row.querySelector('.status');
      statusCell.innerHTML = '';
      const chip = document.createElement('span');
      chip.className = 'status-chip';
      chip.textContent = info.statusText;
      chip.classList.add(
        info.statusText === 'Tối ưu' ? 'ok' :
          info.statusText === 'Hơi thấp' ? 'warn' :
            ['Thấp', 'Không nghỉ', 'Quá cao', 'Dày'].includes(info.statusText) ? 'danger' : 'info'
      );
      statusCell.appendChild(chip);
    });
  }

  function highlightWeek(day) {
    const week = weekOfDay(day);
    [...tableBody.querySelectorAll('tr')].forEach((tr, idx) => {
      const d = idx + 1;
      const w = weekOfDay(d);
      if (w === week) tr.classList.add('week-highlight'); else tr.classList.remove('week-highlight');
    });
  }

  function computeGlobalMetrics() {
    let total = 0, lastRest = '—', streak = 0, maxStreak = 0;
    for (let d = 1; d <= 30; d++) {
      if (data[d].ada) {
        streak++;
        total++;
        if (streak > maxStreak) maxStreak = streak;
      } else {
        if (streak > maxStreak) maxStreak = streak;
        streak = 0;
        lastRest = d;
      }
    }
    const avg = (total / 4).toFixed(1);
    return {total, avg, maxStreak, lastRest};
  }

  function updateMetrics() {
    const metrics = computeGlobalMetrics();
    mTotal.textContent = metrics.total;
    mAvg.textContent = metrics.avg;
    mStreak.textContent = metrics.maxStreak;
    mLastRest.textContent = metrics.lastRest === '—' ? 'Chưa' : metrics.lastRest;
    const today = +currentDayInput.value;
    let last6 = 0;
    for (let d = Math.max(1, today - 6); d < today; d++) if (data[d].ada) last6++;
    let hint = '';
    if (data[today].ada) hint = 'Đã dùng (ADA).';
    else if (last6 >= 5) hint = 'Nên nghỉ/buffer.';
    else if (last6 <= 3) hint = 'Có thể dùng ADA.';
    else hint = 'Dùng hoặc nghỉ đều ổn.';
    mTodayHint.textContent = hint;

    let risk = false, s = 0;
    for (let d = 1; d <= 30; d++) {
      if (data[d].ada) {
        s++;
        if (s >= 7) {
          risk = true;
          break;
        }
      } else s = 0;
    }
    let adv = '';
    if (risk) adv += 'Chuỗi ≥7 đêm: chèn 1 đêm nghỉ. ';
    if (metrics.total < (5 * 4 - 2)) adv += 'Tổng tần suất hơi thấp (hướng 5–6/tuần). ';
    if (!adv) adv = 'Tần suất ổn định.';
    adaSummary.textContent = adv;
  }

  /* Quick Note Modal */
  function openQuickNoteModal(day) {
    qneCurrentDay = day;
    qneDay.textContent = day;
    qneText.value = getQuickNote(day);
    qModal.style.display = 'flex';
    qModal.setAttribute('aria-hidden', 'false');
    qneText.focus();
  }

  function closeQuickNoteModal() {
    qModal.style.display = 'none';
    qModal.setAttribute('aria-hidden', 'true');
  }

  qneSave.addEventListener('click', () => {
    if (qneCurrentDay == null) return;
    setQuickNote(qneCurrentDay, qneText.value);
    renderRows();
    drawAdapaleneChart();
    closeQuickNoteModal();
  });
  qneDelete.addEventListener('click', () => {
    if (qneCurrentDay == null) return;
    if (confirm('Xóa Quick Note ngày ' + qneCurrentDay + '?')) {
      setQuickNote(qneCurrentDay, '');
      renderRows();
      drawAdapaleneChart();
      closeQuickNoteModal();
    }
  });
  qneClose.addEventListener('click', closeQuickNoteModal);
  qModal.addEventListener('click', e => {
    if (e.target === qModal) closeQuickNoteModal();
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && qModal.style.display === 'flex') closeQuickNoteModal();
  });

  /* Chart */
  function drawAdapaleneChart() {
    if (!ctx) return;
    const style = getComputedStyle(document.documentElement);
    const border = style.getPropertyValue('--border').trim();
    const adaColor = style.getPropertyValue('--accent-alt').trim() || '#ff9d17';
    const offColor = style.getPropertyValue('--code').trim();
    const accent = style.getPropertyValue('--accent').trim();
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    const W = chartCanvas.width, H = chartCanvas.height;
    const leftPad = 35, rightPad = 10, topPad = 18, bottomPad = 26;
    ctx.lineWidth = 1;
    ctx.strokeStyle = border;
    ctx.font = '10px system-ui';
    ctx.fillStyle = style.getPropertyValue('--fg').trim();

    for (let w = 1; w <= 5; w++) {
      const start = (weekRange(w)[0] - 0.5);
      const x = leftPad + ((W - leftPad - rightPad) / 30) * start;
      ctx.beginPath();
      ctx.moveTo(x, topPad - 8);
      ctx.lineTo(x, H - bottomPad + 4);
      ctx.stroke();
    }

    const barW = (W - leftPad - rightPad) / 30 - 4;
    for (let d = 1; d <= 30; d++) {
      const used = data[d].ada === 1;
      const x = leftPad + ((W - leftPad - rightPad) / 30) * (d - 1) + 2;
      const h = used ? (H - topPad - bottomPad) * 0.8 : (H - topPad - bottomPad) * 0.25;
      const y = H - bottomPad - h;
      ctx.fillStyle = used ? adaColor : offColor;
      ctx.strokeStyle = border;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, barW, h, 4); else ctx.rect(x, y, barW, h);
      ctx.fill();
      ctx.stroke();
    }

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = accent;
    for (let w = 1; w <= 4; w++) {
      const r = weekRange(w);
      const x1 = leftPad + ((W - leftPad - rightPad) / 30) * (r[0] - 1);
      const x2 = leftPad + ((W - leftPad - rightPad) / 30) * (r[1]);
      ctx.fillRect(x1, topPad, x2 - x1, (H - topPad - bottomPad) * 0.85);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = style.getPropertyValue('--fg').trim();
    for (let d = 1; d <= 30; d++) {
      if (d === 1 || d % 5 === 0) {
        const x = leftPad + ((W - leftPad - rightPad) / 30) * (d - 1) + barW / 2;
        ctx.save();
        ctx.translate(x, H - bottomPad + 12);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(String(d), 0, 0);
        ctx.restore();
      }
    }
    ctx.font = '11px system-ui';
    ctx.fillText('Longest streak: ' + computeGlobalMetrics().maxStreak, leftPad, 12);
  }

  window.drawAdapaleneChart = drawAdapaleneChart;

  // INIT
  renderRows();
  updateExperiencedLog();
  highlightWeek(+currentDayInput.value);
  updateMetrics();
  drawAdapaleneChart();
  window.addEventListener('resize', () => drawAdapaleneChart());
})();

/* DAILY NOTES */
(function () {
  const grid = document.getElementById('notesGrid');
  if (!grid) return;
  const statusEl = document.getElementById('notesStatus');
  const dayInput = document.getElementById('noteDay');
  const prevBtn = document.getElementById('dayPrev');
  const nextBtn = document.getElementById('dayNext');
  const copyPrevBtn = document.getElementById('duplicatePrev');
  const lockBtn = document.getElementById('lockToggle');
  const clearBtn = document.getElementById('clearNotes');
  const exportBtn = document.getElementById('exportNotes');
  const importBtn = document.getElementById('importNotes');
  const historyBtn = document.getElementById('historyBtn');
  const realDateSpan = document.getElementById('notesRealDate');
  const realDatePicker = document.getElementById('notesRealDatePicker');

  const historyPanel = document.getElementById('historyPanel');
  const historyClose = document.getElementById('historyClose');
  const historyList = document.getElementById('historyList');
  const historyDetail = document.getElementById('historyDetail');
  const historyFilterCat = document.getElementById('historyFilterCat');
  const historyRefresh = document.getElementById('historyRefresh');

  const startDateKey = 'acne-calendar-start';

  function getStartDate() {
    const v = localStorage.getItem(startDateKey);
    return v ? new Date(v) : null;
  }

  const prefix = 'acne-notes-v1.0.1-day-';
  const cats = [...grid.querySelectorAll('.note-card')].map(c => c.dataset.key);

  function notify(msg, temp) {
    statusEl.textContent = msg;
    if (temp) {
      clearTimeout(notify._t);
      notify._t = setTimeout(() => statusEl.textContent = '', 2300);
    }
  }

  function currentDay() {
    let d = +dayInput.value;
    if (d < 1) d = 1;
    if (d > 30) d = 30;
    dayInput.value = d;
    return d;
  }

  function keyFor(day, cat) {
    return prefix + day + '-' + cat;
  }

  function loadDay(day) {
    cats.forEach(cat => {
      const card = grid.querySelector('.note-card[data-key="' + cat + '"]');
      const ta = card.querySelector('.note-area');
      ta.value = localStorage.getItem(keyFor(day, cat)) || '';
    });
    updateNotesRealDateDisplay();
    notify('Đã tải ngày ' + day);
  }

  function saveCat(day, cat) {
    const ta = grid.querySelector('.note-card[data-key="' + cat + '"] .note-area');
    if (ta.value.trim()) localStorage.setItem(keyFor(day, cat), ta.value);
    else localStorage.removeItem(keyFor(day, cat));
    notify('Lưu ' + cat + ' (ngày ' + day + ')', true);
  }

  function clearCat(day, cat) {
    localStorage.removeItem(keyFor(day, cat));
    const ta = grid.querySelector('.note-card[data-key="' + cat + '"] .note-area');
    ta.value = '';
    notify('Xóa ' + cat + ' ngày ' + day, true);
  }

  grid.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const card = e.target.closest('.note-card');
    if (!card) return;
    const cat = card.dataset.key;
    const d = currentDay();
    if (btn.hasAttribute('data-save')) saveCat(d, cat);
    if (btn.hasAttribute('data-clear')) {
      if (confirm('Xóa nội dung ' + cat + ' ngày ' + d + '?')) clearCat(d, cat);
    }
  });

  let autosaveT;
  grid.addEventListener('input', e => {
    if (!e.target.classList.contains('note-area')) return;
    clearTimeout(autosaveT);
    autosaveT = setTimeout(() => {
      const card = e.target.closest('.note-card');
      saveCat(currentDay(), card.dataset.key);
    }, 900);
  });

  prevBtn.addEventListener('click', () => {
    let d = currentDay();
    if (d > 1) {
      d--;
      dayInput.value = d;
      loadDay(d);
      if (window.setTrackerDay) window.setTrackerDay(d);
    }
  });
  nextBtn.addEventListener('click', () => {
    let d = currentDay();
    if (d < 30) {
      d++;
      dayInput.value = d;
      loadDay(d);
      if (window.setTrackerDay) window.setTrackerDay(d);
    }
  });
  dayInput.addEventListener('change', () => loadDay(currentDay()));

  copyPrevBtn.addEventListener('click', () => {
    const d = currentDay();
    if (d === 1) return alert('Ngày 1 không có hôm trước.');
    if (!confirm('Copy toàn bộ từ ngày ' + (d - 1) + ' sang ' + d + '?')) return;
    cats.forEach(cat => {
      const pv = localStorage.getItem(keyFor(d - 1, cat)) || '';
      if (pv.trim()) {
        localStorage.setItem(keyFor(d, cat), pv);
        const ta = grid.querySelector('.note-card[data-key="' + cat + '"] .note-area');
        ta.value = pv;
      }
    });
    notify('Đã copy từ ngày ' + (d - 1), true);
  });

  lockBtn.addEventListener('click', () => {
    const locked = lockBtn.getAttribute('data-locked') === 'true';
    lockBtn.setAttribute('data-locked', !locked);
    lockBtn.textContent = locked ? 'Khóa' : 'Mở khóa';
    grid.querySelectorAll('.note-area').forEach(ta => {
      ta.readOnly = !locked ? true : false;
      ta.style.opacity = ta.readOnly ? .7 : 1;
    });
    notify(locked ? 'Đã mở' : 'Đã khóa', true);
  });

  clearBtn.addEventListener('click', () => {
    const d = currentDay();
    if (!confirm('Xóa toàn bộ ghi chú ngày ' + d + '?')) return;
    cats.forEach(cat => clearCat(d, cat));
    notify('Đã xóa ngày ' + d, true);
  });

  exportBtn.addEventListener('click', () => {
    const out = {};
    for (let d = 1; d <= 30; d++) {
      cats.forEach(cat => {
        const v = localStorage.getItem(keyFor(d, cat));
        if (v) {
          if (!out[d]) out[d] = {};
          out[d][cat] = v;
        }
      });
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acne-notes-v1.0.1.json';
    a.click();
    URL.revokeObjectURL(url);
    notify('Đã xuất JSON', true);
  });

  importBtn.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json';
    inp.onchange = () => {
      const f = inp.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const obj = JSON.parse(fr.result);
          Object.entries(obj).forEach(([dStr, catObj]) => {
            const d = +dStr;
            if (d >= 1 && d <= 30) {
              Object.entries(catObj).forEach(([cat, val]) => {
                if (cats.includes(cat) && val.trim())
                  localStorage.setItem(keyFor(d, cat), val);
              });
            }
          });
          loadDay(currentDay());
          notify('Đã nhập ghi chú', true);
        } catch (e) {
          alert('File không hợp lệ');
        }
      };
      fr.readAsText(f);
    };
    inp.click();
  });

  // HISTORY
  historyBtn.addEventListener('click', openHistory);
  historyClose.addEventListener('click', closeHistory);
  historyPanel.addEventListener('click', e => {
    if (e.target === historyPanel) closeHistory();
  });
  historyFilterCat.addEventListener('change', buildHistory);
  historyRefresh.addEventListener('click', buildHistory);

  function openHistory() {
    buildHistory();
    historyPanel.style.display = 'flex';
    historyPanel.setAttribute('aria-hidden', 'false');
  }

  function closeHistory() {
    historyPanel.style.display = 'none';
    historyPanel.setAttribute('aria-hidden', 'true');
    historyDetail.style.display = 'none';
  }

  function buildHistory() {
    historyList.innerHTML = '';
    const filter = historyFilterCat.value;
    const daysWith = {};
    for (let d = 1; d <= 30; d++) {
      let count = 0;
      cats.forEach(cat => {
        if (localStorage.getItem(keyFor(d, cat))) count++;
      });
      if (count > 0) {
        if (filter) {
          if (localStorage.getItem(keyFor(d, filter))) daysWith[d] = count;
        } else daysWith[d] = count;
      }
    }
    const entries = Object.entries(daysWith);
    if (!entries.length) {
      historyList.innerHTML = '<div style="font-size:.65rem;opacity:.7">Không có ngày phù hợp.</div>';
      return;
    }
    entries.forEach(([d, count]) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.dataset.day = d;
      div.innerHTML = '<strong>Ngày ' + d + '</strong><div>Số mục: ' + count + '</div><div class="history-tags">' + buildTags(+d) + '</div>';
      historyList.appendChild(div);
    });
  }

  function buildTags(day) {
    let html = '';
    cats.forEach(cat => {
      if (localStorage.getItem(keyFor(day, cat))) html += '<span class="history-tag">' + cat + '</span>';
    });
    return html;
  }

  historyList.addEventListener('click', e => {
    const item = e.target.closest('.history-item');
    if (!item) return;
    const d = +item.dataset.day;
    let detail = 'Ngày ' + d + '\\n';
    cats.forEach(cat => {
      const v = localStorage.getItem(keyFor(d, cat));
      if (v) detail += '[' + cat + ']\\n' + v.trim() + '\\n\\n';
    });
    historyDetail.style.display = 'block';
    historyDetail.textContent = detail.trim();
    if (confirm('Tải nội dung ngày ' + d + ' vào ghi chú?')) {
      dayInput.value = d;
      loadDay(d);
      if (window.setTrackerDay) window.setTrackerDay(d);
      closeHistory();
    }
  });

  function updateNotesRealDateDisplay() {
    const sd = getStartDate();
    const d = currentDay();
    if (!sd) {
      realDateSpan.textContent = 'Chưa thiết lập ngày bắt đầu';
      realDateSpan.style.color = 'var(--accent)';
      realDatePicker.value = '';
      return;
    }
    const real = new Date(sd.getTime() + (d - 1) * 86400000);
    realDateSpan.textContent = 'Ngày thực tế: ' + real.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const iso = real.toISOString().slice(0, 10);
    if (realDatePicker.value !== iso) realDatePicker.value = iso;
  }

  window.updateNotesRealDateDisplay = updateNotesRealDateDisplay;

  realDatePicker.addEventListener('change', () => {
    const sd = getStartDate();
    if (!sd || !realDatePicker.value) {
      if (!sd) alert('Chưa thiết lập "Ngày bắt đầu" ở Tracker.');
      return;
    }
    const chosen = new Date(realDatePicker.value + 'T00:00:00');
    const diff = Math.round((chosen - sd) / 86400000) + 1;
    if (diff >= 1 && diff <= 30) {
      dayInput.value = diff;
      loadDay(diff);
      if (window.setTrackerDay) window.setTrackerDay(diff);
    } else {
      alert('Ngày ngoài phạm vi 30 ngày.');
      updateNotesRealDateDisplay();
    }
  });

  window.setNotesDay = function (day, scroll) {
    if (day < 1 || day > 30) return;
    dayInput.value = day;
    loadDay(day);
    if (scroll) document.getElementById('personal-notes').scrollIntoView({behavior: 'smooth'});
  };
  window.setTrackerDay = function (day) {
    const inp = document.getElementById('trkCurrentDay');
    if (inp) {
      inp.value = day;
      const evt = new Event('change');
      inp.dispatchEvent(evt);
    }
  };

  loadDay(currentDay());
})();
