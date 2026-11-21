let scheduleData = null;
let schedule = [];
let nextSchedule = null;
let viewingNext = false;
let selectedIndex = 0;

const ICON_LOCATION = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>';
const ICON_CLOCK = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>';

const dayStrip = document.getElementById('dayStrip');
const stopName = document.getElementById('stopName');
const stopNote = document.getElementById('stopNote');
const stopAddress = document.getElementById('stopAddress');
const stopHours = document.getElementById('stopHours');
const mapsBtn = document.getElementById('mapsBtn');
const todayStopName = document.getElementById('todayStopName');
const todayAddress = document.getElementById('todayAddress');
const todayHours = document.getElementById('todayHours');
const weekTabs = document.getElementById('weekTabs');
const locationPanel = document.getElementById('locationPanel');
const twoStops = document.getElementById('twoStops');
const SFF_URL = 'https://streetfoodfinder.com/CoastalCreperie';

async function loadSchedule() {
  try {
    const response = await fetch('./schedule.json');

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    scheduleData = await response.json();

    console.log('Schedule loaded:', scheduleData);

    loadCurrentWeek();

  } catch (error) {
    console.error('Could not load schedule:', error);
  }
}

function getWeekStart(weekOffset = 0) {
  const today = new Date();

  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);

  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const day = String(sunday.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// ---- Time / active-location helpers ----

function parseTimeToMinutes(timeStr) {
  // Parses "9:00 AM" or "12:30 PM" into minutes since midnight
  const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;

  let [, hourStr, minStr, period] = match;
  let hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);

  period = period.toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  return hour * 60 + min;
}

function parseHoursRange(hoursStr) {
  // "9:00 AM – 12:00 PM" -> { start, end } in minutes since midnight
  const [startStr, endStr] = hoursStr.split(/[–-]/);

  return {
    start: parseTimeToMinutes(startStr),
    end: parseTimeToMinutes(endStr)
  };
}

function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isWithinRange(nowMin, start, end) {
  if (start === null || end === null) return false;

  // Handle ranges that cross midnight, e.g. "9:00 PM – 1:00 AM"
  if (end <= start) {
    end += 24 * 60;
    if (nowMin < start) nowMin += 24 * 60;
  }

  return nowMin >= start && nowMin < end;
}

function minutesUntil(nowMin, start) {
  if (start === null) return Infinity;
  let diff = start - nowMin;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function getActiveLocation(stop) {
  // Returns { name, address, hours, note, isSecond } for whichever
  // location should be shown right now.
  const primary = {
    name: stop.name,
    address: stop.address,
    hours: stop.hours,
    note: stop.note,
    isSecond: false
  };

  // Accept "secondLocation" (preferred) or the older "second location" key.
  const secondStop = stop.secondLocation || stop['second location'];

  if (!secondStop) return primary;

  const second = {
    name: secondStop.name,
    address: secondStop.address,
    hours: secondStop.hours,
    note: secondStop.note,
    isSecond: true
  };

  const nowMin = getNowMinutes();
  const primaryRange = parseHoursRange(stop.hours);
  const secondRange = parseHoursRange(secondStop.hours);

  if (isWithinRange(nowMin, secondRange.start, secondRange.end)) return second;
  if (isWithinRange(nowMin, primaryRange.start, primaryRange.end)) return primary;

  const primaryIsFirst = primaryRange.start <= secondRange.start;
  const firstLoc = primaryIsFirst ? primary : second;
  const firstRange = primaryIsFirst ? primaryRange : secondRange;
  const lastLoc = primaryIsFirst ? second : primary;
  const lastRange = primaryIsFirst ? secondRange : primaryRange;

  if (nowMin < firstRange.start) {
    return firstLoc;
  }

  return lastLoc;
}

function updateTodayCard(){
  const todayIndex = new Date().getDay();
  const todayStop = schedule[todayIndex];

  if (!todayStop || todayStop.closed){
    todayStopName.textContent = 'No Service Today';
    todayAddress.textContent = '';
    todayHours.textContent = 'Closed';
    return;
  }

  const active = getActiveLocation(todayStop);

  todayStopName.textContent = active.name;
  todayAddress.textContent = active.address;
  todayHours.textContent = active.hours;
}

function loadCurrentWeek() {
  const weekStart = getWeekStart();

  console.log('Current week:', weekStart);

  schedule = scheduleData.weeks[weekStart];
  nextSchedule = scheduleData.weeks[getWeekStart(1)] || null;

  setupWeekTabs();

  if (!schedule) {
    todayStopName.textContent = 'Find us on StreetFoodFinder';
    todayAddress.textContent = 'streetfoodfinder.com/CoastalCreperie';
    todayHours.textContent = '';
  } else {
    updateTodayCard();
  }

  showWeek(false);
}

// The week currently shown in the schedule section
function shownWeek() {
  return viewingNext ? nextSchedule : schedule;
}

function setupWeekTabs() {
  if (!weekTabs) return;

  weekTabs.querySelectorAll('.week__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      showWeek(tab.dataset.week === 'next');
    });
  });
}

function renderWeekTabs() {
  if (!weekTabs) return;

  weekTabs.querySelectorAll('.week__tab').forEach(tab => {
    const isActive = (tab.dataset.week === 'next') === viewingNext;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function showWeek(next) {
  viewingNext = next;
  renderWeekTabs();

  if (!shownWeek()) {
    showEmptyWeek();
    return;
  }

  // Highlight today only on the current week; next week starts on Sunday
  selectedIndex = viewingNext ? 0 : new Date().getDay();

  renderDayStrip();
  updatePanel();
}

function showEmptyWeek() {
  const label = viewingNext ? 'Next week\'s' : 'This week\'s';

  dayStrip.innerHTML = `
    <p>${label} schedule is coming soon. See our latest stops on <a href="${SFF_URL}" target="_blank" rel="noopener">StreetFoodFinder</a>.</p>
  `;
  setTwoStopMode(false);
  stopName.textContent = 'Schedule coming soon';
  stopNote.textContent = viewingNext
    ? 'Follow us on Instagram or StreetFoodFinder for next week\'s stops.'
    : 'Follow us on Instagram or StreetFoodFinder for this week\'s stops.';
  stopAddress.textContent = '';
  stopHours.textContent = '';
  mapsBtn.style.display = 'none';
}

function renderDayStrip() {
  dayStrip.innerHTML = '';

  shownWeek().forEach((stop, i) => {
    const card = document.createElement('button');

    card.className =
      'day__card' +
      (i === selectedIndex ? ' selected' : '');

    const hasTwo = !stop.closed && !!(stop.secondLocation || stop['second location']);

    if (hasTwo) card.classList.add('has-two');

    card.innerHTML = `
      <span class="dow">${stop.dow}</span>
      <span class="date">${stop.date}</span>
      <span class="mon">${stop.mon}</span>
      ${hasTwo ? '<span class="stops__badge">2 stops</span>' : ''}
    `;

    card.addEventListener('click', () => {
      selectDay(i);
    });

    dayStrip.appendChild(card);
  });
}

function selectDay(i) {
  selectedIndex = i;

  renderDayStrip();
  updatePanel();
}

function openMaps(address) {
  const query = encodeURIComponent(address);

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${query}`,
    '_blank'
  );
}

function setTwoStopMode(on) {
  if (!locationPanel || !twoStops) return;
  locationPanel.style.display = on ? 'none' : '';
  twoStops.style.display = on ? '' : 'none';
  if (!on) twoStops.innerHTML = '';
}

function timeOfDayLabel(hours) {
  const start = parseHoursRange(hours).start;
  if (start === null) return '';
  if (start < 11 * 60) return 'Morning';
  if (start < 15 * 60) return 'Midday';
  if (start < 16 * 60) return 'Afternoon';
  return 'Evening';
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function renderTwoStops(stop, secondStop) {
  const stops = [
    { name: stop.name, address: stop.address, hours: stop.hours, note: stop.note },
    { name: secondStop.name, address: secondStop.address, hours: secondStop.hours, note: secondStop.note }
  ].sort((a, b) => parseHoursRange(a.hours).start - parseHoursRange(b.hours).start);

  // Only today (on the current week) gets "Now serving" / "Up next"
  const isToday = !viewingNext && selectedIndex === new Date().getDay();
  let highlight = -1;
  let status = '';

  if (isToday) {
    const nowMin = getNowMinutes();
    stops.forEach((s, i) => {
      const r = parseHoursRange(s.hours);
      if (highlight === -1 && isWithinRange(nowMin, r.start, r.end)) {
        highlight = i;
        status = 'Now serving';
      }
    });
    if (highlight === -1) {
      const nextIdx = stops.findIndex(s => nowMin < parseHoursRange(s.hours).start);
      if (nextIdx !== -1) {
        highlight = nextIdx;
        status = 'Up next';
      }
    }
  }

  twoStops.innerHTML = stops.map((s, i) => `
    <div class="stop__block${i === highlight ? ' is-current' : ''}">
      <div class="stop__label">
        <span>Stop ${i + 1} · ${timeOfDayLabel(s.hours)}</span>
        ${i === highlight ? `<span class="stop__status"><span class="dot"></span>${status}</span>` : ''}
      </div>
      <h3 class="stop__name">${escapeHtml(s.name)}</h3>
      <div class="row">
        ${ICON_LOCATION}
        <span>${escapeHtml(s.address)}</span>
      </div>
      <div class="row">
        ${ICON_CLOCK}
        <span>${escapeHtml(s.hours)}</span>
      </div>
      <button class="maps__btn btn" data-address="${escapeHtml(s.address)}">Open in Maps</button>
    </div>
  `).join('');

  twoStops.querySelectorAll('.maps__btn').forEach(btn => {
    btn.addEventListener('click', () => openMaps(btn.dataset.address));
  });
}

function updatePanel() {
  const week = shownWeek();
  if (!week) return;

  const stop = week[selectedIndex];

  if (stop.closed) {
    setTwoStopMode(false);
    stopName.textContent = viewingNext ? 'No service this day' : 'No service today';
    stopNote.textContent = viewingNext
      ? 'We are taking the day off. Check the other days for our stops!'
      : 'We are taking the day off. Check back tomorrow!';
    stopAddress.textContent = '';
    stopHours.textContent = 'Closed';

    mapsBtn.style.display = 'none';

    return;
  }

  // Days with two stops show both as equal blocks
  const secondStop = stop.secondLocation || stop['second location'];

  if (secondStop) {
    setTwoStopMode(true);
    renderTwoStops(stop, secondStop);
    return;
  }

  setTwoStopMode(false);

  stopName.textContent = stop.name;
  stopNote.textContent = stop.note;
  stopAddress.textContent = stop.address;
  stopHours.textContent = stop.hours;

  mapsBtn.style.display = 'inline-flex';

  mapsBtn.onclick = () => openMaps(stop.address);
}

document.getElementById('findUsBtn').addEventListener('click', () => {
  document
    .getElementById('schedule')
    .scrollIntoView({
      behavior: 'smooth'
    });
});

// Load JSON
loadSchedule();
// Re-check every minute so a stop with a second location swaps over
// automatically, without needing a page reload.
setInterval(() => {
  if (!schedule || !schedule.length) return;

  updateTodayCard();
  if (!viewingNext) updatePanel();
}, 60 * 1000);


  // ---- Menu ----
  const menu = {
    signature: {
      label: 'Signature Crepes',
      kicker: 'From the Krampouz griddle',
      desc: 'Every signature crepe features its own house-made signature sauce, crafted daily.',
      image: './assets/fifth_steak.webp',
      items: [
        { name:'The Fifth Ave Steak', desc:'Grilled Tri-Tip Steak, Cheese, Tomatoes, Marinated Onion and Spring Mix', tags:'House-Made Signature Sauce · Crafted Daily', price:'$18.00', image:'./assets/fifth_steak.webp' },
        { name:'Naples Sunset Shrimp', desc:'Grilled Shrimp, Cheese, Arugula, Onion and Tomatoes', tags:'House-Made Signature Sauce · Crafted Daily', price:'$18.00', image:'./assets/shrimp.webp' },
        { name:'Gulf Coast Chicken & Mushrooms', desc:'Grilled Chicken, Sauteed Mushrooms, Spring Mix, Cheese, Tomatoes and Onion', tags:'House-Made Signature Sauce · Crafted Daily', price:'$16.00', image:'./assets/coast_chicken.webp' },
      ]
    },
    crepes: {
      label: 'Sweet Crepes',
      kicker: 'From the Krampouz griddle',
      desc: 'Full crepes, not garnish. If it’s a strawberry crepe, you get a real amount of berries, not three pieces for the photo.',
      image: './assets/berry_bliss.webp',
      items: [
        { name:'Classic Nutella', desc:'Nutella', tags:'Sweet', price:'$9.00' },
        { name:'The Berry Bliss', desc:'Nutella, Fresh Berries, Dark Chocolate', tags:'Sweet', price:'$13.00', image:'./assets/berry_bliss.webp' },
        { name:'Nutella Strawberry', desc:'Nutella, Strawberries', tags:'Sweet', price:'$11.00' },
        { name:'Nutella Banana', desc:'Nutella, Bananas', tags:'Sweet', price:'$11.00', image:'./assets/banana_nutella.webp' },
        { name:'Nutella Strawberry Banana', desc:'Nutella, Strawberries, Bananas', tags:'Sweet', price:'$12.00' },
        { name:'Campfire S’more', desc:'Nutella, Graham Crackers, Marshmallows', tags:'Sweet', price:'$12.00', image:'./assets/smores.webp' },
        { name:'Coco Bliss', desc:'Condensed Milk, Berries, Coconut Shavings, Chocolate Drizzle', tags:'Sweet', price:'$13.00', image:'./assets/coco.webp' },
        { name:'Caramel Banana Crepe', desc:'Caramel, Bananas', tags:'Sweet', price:'$12.00' },
      ]
    },
    savory_crepes: {
      label: 'Savory Crepes',
      kicker: 'From the Krampouz griddle',
      desc: 'Fresh, savory and folded to order.',
      image: './assets/capri_sun.webp',
      items: [
        { name:'The Capri Sun', desc:'Fresh Mozzarella, Pesto Sauce, Tomatoes and Arugula. Add Chicken + $2', tags:'Savory', price:'$14.00', image:'./assets/capri_sun.webp' },
        { name:'Naples Smoke & Cream', desc:'Smoked Salmon, Mascarpone, Arugula, Capers, Onion and Tomato', tags:'Savory', price:'$18.00' },
        { name:'Breakfast Crepe', desc:'Cheese, Eggs, and your choice of Ham or Grilled Chicken', tags:'Savory · Breakfast', price:'$14.00' },
      ]
    },
    coffee: {
      label:'Coffee',
      kicker:'Freshly roasted coffee',
      desc:'Specialty coffee made with beans freshly roasted by a local roaster. Enjoy any latte hot or iced, and top it with vanilla cold foam. All lattes are 16oz. All signature lattes are $7.50.',
      image: './assets/coffee.webp',
      items: [
        { name:'Espresso', desc:'Classic', tags:'Classics', price:'$4.00' },
        { name:'Cappuccino', desc:'Classic', tags:'Classics', price:'$6.00' },
        { name:'Latte', desc:'Classic, 16oz', tags:'Classics', price:'$6.00' },
        { name:'Americano', desc:'Classic', tags:'Classics', price:'$5.00' },
        { name:'Mocha', desc:'Classic, 16oz', tags:'Classics', price:'$7.00' },
        { name:'Hot Chocolate', desc:'Classic', tags:'Classics', price:'$6.00' },
        { name:'Cookie Butter Latte', desc:'Cookie Butter, 16oz', tags:'Signature Latte', price:'$7.50', image: './assets/coffee.webp' },
        { name:'Caramel Drizzle Latte', desc:'Caramel, 16oz', tags:'Signature Latte', price:'$7.50', image: '' },
        { name:'Banana Bread Latte', desc:'Banana Bread, 16oz', tags:'Signature Latte', price:'$7.50', image: './assets/coffee.webp' },
        { name:'Gingerbread Cookie Latte', desc:'Gingerbread Cookie, 16oz', tags:'Signature Latte · Holiday', price:'$7.50', image: './assets/coffee.webp' },
        { name:'S’mores Latte', desc:'S’mores, 16oz', tags:'Signature Latte', price:'$7.50', image: './assets/coffee.webp' },
        { name:'Cardamom Bun Latte', desc:'Cardamom Bun, 16oz', tags:'Signature Latte', price:'$7.50', image: './assets/coffee.webp' },
        { name:'Peppermint Mocha Latte', desc:'Peppermint Mocha, 16oz', tags:'Signature Latte · Holiday', price:'$7.50', image: './assets/coffee.webp' },
        { name:'Cranberry Vanilla Latte', desc:'Cranberry Vanilla, 16oz', tags:'Signature Latte · Holiday', price:'$7.50', image: './assets/coffee.webp' },
      ]
    },
    matcha: {
      label:'Matcha',
      kicker:'First-harvest matcha',
      desc:'Our matcha lattes are made with first-harvest matcha shipped from Kyoto, Japan every few weeks. All matchas are 16oz. All signature matchas are $8.',
      image: '',
      items: [
        { name:'Matcha', desc:'First-harvest Matcha, 16oz', tags:'Fresh', price:'$7.00', image: '' },
        { name:'Islamorada Matcha', desc:'Mango + Guava', tags:'Signature Matcha', price:'$8.00', image: '' },
        { name:'Jasmine Honey Matcha', desc:'Jasmine, Honey', tags:'Signature Matcha', price:'$8.00', image: '' },
        { name:'Fruit Matcha', desc:'Mango, Strawberry, Raspberry, or Blueberry', tags:'Signature Matcha', price:'$8.00' },
        { name:'Strawberry Vanilla Matcha', desc:'Strawberry, Vanilla', tags:'Signature Matcha', price:'$8.00' },
        { name:'Banana Bread Matcha', desc:'Banana Bread', tags:'Signature Matcha', price:'$8.00' },
        { name:'Cardamom Bun Matcha', desc:'Cardamom Bun', tags:'Signature Matcha', price:'$8.00' },
        { name:'Cranberry Vanilla Matcha', desc:'Cranberry, Vanilla', tags:'Signature Matcha · Holiday', price:'$8.00' },
      ]
    },
    lemonade: {
      label:'Refreshments',
      kicker:'Freshly squeezed lemonade',
      desc:'Fresh-squeezed lemons, 32oz.',
      image: './assets/lemonade.webp',
      items: [
        { name:'Freshly Squeezed Lemonade', desc:'Regular, 32oz', tags:'Bright · Fresh', price:'$7.00', image: './assets/lemonade.webp' },
        { name:'Freshly Squeezed Lemonade with Flavor', desc:'Choose a flavor, 32oz', tags:'Bright · Fresh', price:'$8.00', image:'./assets/blue_raspberry.webp' },
        { name:'Jalapeno Lemonade', desc:'Lemon, Jalapeno', tags:'Spicy · Fresh', price:'$8.00' },
        { name:'Sweet Tea Lemonade', desc:'Sweet Tea, Lemonade', tags:'Refreshing', price:'$7.50' },
      ]
    },
    additions: {
      label:'Additions',
      kicker:'Make it yours',
      desc:'Extras for any drink.',
      image: './assets/coffee.webp',
      items: [
        { name:'Espresso Shot', desc:'Extra shot', tags:'Addition', price:'$2.00' },
        { name:'Milk Options', desc:'Oat Milk or Almond Milk', tags:'Addition', price:'$0.75' },
        { name:'Cold Foam', desc:'Vanilla', tags:'Addition', price:'$1.00' },
        { name:'Flavored Syrups', desc:'Add a flavor', tags:'Addition', price:'$0.75' },
      ]
    }
  };

  const pillRow = document.getElementById('pillRow');
  const menuImage = document.getElementById('menuImage');
  const menuKicker = document.getElementById('menuKicker');
  const menuTitle = document.getElementById('menuTitle');
  const menuDesc = document.getElementById('menuDesc');
  const menuItems = document.getElementById('menuItems');

  let activeCategory = 'signature';

  function renderPills(){
    pillRow.innerHTML = '';
    Object.keys(menu).forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'pill' + (key === activeCategory ? ' active' : '');
      btn.textContent = menu[key].label.toUpperCase();
      btn.addEventListener('click', () => selectCategory(key));
      pillRow.appendChild(btn);
    });
  }

  function selectCategory(key){
    activeCategory = key;
    renderPills();
    renderMenuPanel();
  }

  // Some phone in-app browsers (like Instagram's) can fail to show WebP
  // photos. If a WebP photo fails, try the JPG copy with the same name.
  // Phones get a smaller copy of each photo (name-640.webp); bigger
  // screens get the full photo. Numbers are each full photo's width.
  const PHOTO_WIDTHS = {"banana_nutella":898,"berry_bliss":1200,"blue_raspberry":808,"capri_sun":1200,"coast_chicken":1047,"coco":878,"coffee":952,"fifth_steak":1200,"lemonade":841,"shrimp":847,"smores":1200};
  function setPhoto(img, src){
    img.dataset.triedJpg = '';
    const m = src.match(/^(.*\/)([a-z_]+)\.webp$/i);
    if (m && PHOTO_WIDTHS[m[2]]) {
      img.srcset = `${m[1]}${m[2]}-640.webp 640w, ${src} ${PHOTO_WIDTHS[m[2]]}w`;
    } else {
      img.removeAttribute('srcset');
    }
    if (img.getAttribute('src') !== src) img.src = src;
  }
  function photoFallback(e){
    const img = e.target;
    const src = img.getAttribute('src') || '';
    if (!img.dataset.triedJpg && /\.webp$/i.test(src)) {
      img.dataset.triedJpg = '1';
      img.removeAttribute('srcset');
      img.src = src.replace(/\.webp$/i, '.jpg');
    }
  }
  menuImage.addEventListener('error', photoFallback);

  function itemPhoto(item, cat){
    if ('image' in item) return item.image || '';
    return cat.image || '';
  }

  function renderMenuPanel(){
    const cat = menu[activeCategory];
    const grid = document.querySelector('.menu-grid');
    if (cat.image) {
      grid.classList.remove('no-image');
      menuImage.hidden = false;
      setPhoto(menuImage, cat.image);
      menuImage.alt = cat.label + ' from Coastal Crêperie food truck in Naples, FL';
    } else {
      grid.classList.add('no-image');
      menuImage.removeAttribute('src');
      menuImage.alt = '';
      menuImage.hidden = true;
    }
    menuKicker.textContent = cat.kicker.toUpperCase();
    menuTitle.textContent = cat.label;
    menuDesc.textContent = cat.desc;

    menuItems.innerHTML = '';
    cat.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'menu-item';
      row.innerHTML = `
        <div class="item-main">
          <h4>${item.name}</h4>
          <div class="desc">${item.desc}</div>
          <div class="tags">${item.tags}</div>
        </div>
        <div class="item-price">${item.price}</div>
      `;

            row.addEventListener('click', () => {
        openItemModal(item, itemPhoto(item, cat));
      });

      menuItems.appendChild(row);
    });

    [menuTitle, menuDesc, menuItems].forEach(el => {
      el.classList.remove('fade');
      void el.offsetWidth;
      el.classList.add('fade');
    });
  }

  renderPills();
  renderMenuPanel();

  // ---- Item Modal ----
  const itemModal = document.getElementById('itemModal');
  const modalClose = document.getElementById('modalClose');
  const modalImage = document.getElementById('modalImage');
  const modalName = document.getElementById('modalName');
  const modalTags = document.getElementById('modalTags');
  const modalDesc = document.getElementById('modalDesc');
  const modalPrice = document.getElementById('modalPrice');
  modalImage.addEventListener('error', photoFallback);

  function openItemModal(item, categoryImage){
    if (categoryImage) {
      modalImage.hidden = false;
      setPhoto(modalImage, categoryImage);
      modalImage.alt = item.name + ' from Coastal Crêperie';
    } else {
      modalImage.removeAttribute('src');
      modalImage.alt = '';
      modalImage.hidden = true;
    }
    modalName.textContent = item.name;
    modalTags.textContent = item.tags;
    modalDesc.textContent = item.desc;
    modalPrice.textContent = item.price;

    itemModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
  }

  function closeItemModal(){
    itemModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  modalClose.addEventListener('click', closeItemModal);

  itemModal.addEventListener('click', (e) => {
    if (e.target === itemModal) closeItemModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeItemModal();
  });

 

  // ---- Booking form (FormSubmit AJAX) ----
  const bookingForm = document.getElementById('bookingForm');

  if (bookingForm) {
    const bookingSubmit = document.getElementById('bookingSubmit');
    const bookingStatus = document.getElementById('bookingStatus');
    const FORM_ENDPOINT = 'https://formsubmit.co/ajax/coastalcreperie@gmail.com';

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      bookingStatus.textContent = '';
      bookingStatus.className = 'booking__status';

      // Simple validation with friendly highlighting
      let firstInvalid = null;
      bookingForm.querySelectorAll('[required]').forEach(field => {
        const wrap = field.closest('.booking__field');
        const ok = field.checkValidity();
        wrap.classList.toggle('invalid', !ok);
        if (!ok && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        bookingStatus.textContent = 'Please fill in the highlighted fields.';
        bookingStatus.classList.add('error');
        firstInvalid.focus();
        return;
      }

      const data = Object.fromEntries(new FormData(bookingForm).entries());

      // Honeypot: real visitors never fill this in
      if (data._honey) return;

      data._subject = 'New event inquiry from website';
      data._template = 'table';
      data._captcha = 'false';

      bookingSubmit.disabled = true;
      bookingSubmit.textContent = 'Sending...';

      try {
        const response = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || String(result.success) !== 'true') {
          throw new Error(result.message || `HTTP ${response.status}`);
        }

        bookingForm.innerHTML = `
          <div class="booking__thanks">
            <h3>Thank you!</h3>
            <p>We received your inquiry and will get back to you soon with a menu made for your event.</p>
          </div>
        `;
      } catch (err) {
        console.warn('Booking form error:', err);
        bookingStatus.innerHTML = 'Sorry, something went wrong sending your inquiry. Please email us at <a href="mailto:coastalcreperie@gmail.com">coastalcreperie@gmail.com</a> or call 951-522-1260.';
        bookingStatus.classList.add('error');
        bookingSubmit.disabled = false;
        bookingSubmit.textContent = 'Send inquiry';
      }
    });

    bookingForm.addEventListener('input', (e) => {
      const wrap = e.target.closest('.booking__field');
      if (wrap && e.target.checkValidity()) wrap.classList.remove('invalid');
    });
  }
