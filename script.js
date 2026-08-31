let scheduleData = null;
let schedule = [];
let selectedIndex = 0;

const dayStrip = document.getElementById('dayStrip');
const stopName = document.getElementById('stopName');
const stopNote = document.getElementById('stopNote');
const stopAddress = document.getElementById('stopAddress');
const stopHours = document.getElementById('stopHours');
const mapsBtn = document.getElementById('mapsBtn');
const todayStopName = document.getElementById('todayStopName');
const todayAddress = document.getElementById('todayAddress');
const todayHours = document.getElementById('todayHours');

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

function getWeekStart() {
  const today = new Date();

  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

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

  if (!stop.secondLocation) return primary;

  const second = {
    name: stop.secondLocation.name,
    address: stop.secondLocation.address,
    hours: stop.secondLocation.hours,
    note: stop.secondLocation.note,
    isSecond: true
  };

  const nowMin = getNowMinutes();
  const primaryRange = parseHoursRange(stop.hours);
  const secondRange = parseHoursRange(stop.secondLocation.hours);

  if (isWithinRange(nowMin, secondRange.start, secondRange.end)) return second;
  if (isWithinRange(nowMin, primaryRange.start, primaryRange.end)) return primary;

  // Neither window is open right now — show whichever comes up next.
  const untilPrimary = minutesUntil(nowMin, primaryRange.start);
  const untilSecond = minutesUntil(nowMin, secondRange.start);

  return untilSecond < untilPrimary ? second : primary;
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

  if (!schedule) {
    dayStrip.innerHTML = `
      <p>No schedule available for this week.</p>
    `;

    return;
  }

  // Select today's day
  const today = new Date().getDay();

  selectedIndex = today;

  renderDayStrip();
  updatePanel();
  updateTodayCard();
}

function renderDayStrip() {
  dayStrip.innerHTML = '';

  schedule.forEach((stop, i) => {
    const card = document.createElement('button');

    card.className =
      'day__card' +
      (i === selectedIndex ? ' selected' : '');

    card.innerHTML = `
      <span class="dow">${stop.dow}</span>
      <span class="date">${stop.date}</span>
      <span class="mon">${stop.mon}</span>
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

function updatePanel() {
  const stop = schedule[selectedIndex];

  if (stop.closed) {
    stopName.textContent = 'No service today';
    stopNote.textContent = 'We are taking the day off. Check back tomorrow!';
    stopAddress.textContent = '';
    stopHours.textContent = 'Closed';

    mapsBtn.style.display = 'none';

    return;
  }

  const active = getActiveLocation(stop);

  stopName.textContent = active.name;
  stopNote.textContent = active.note;
  stopAddress.textContent = active.address;
  stopHours.textContent = active.hours;

  mapsBtn.style.display = 'inline-flex';

  mapsBtn.onclick = () => {
    const query = encodeURIComponent(active.address);

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank'
    );
  };
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
  if (!schedule.length) return;

  updateTodayCard();
  updatePanel();
}, 60 * 1000);

  // ---- Menu ----
  const menu = {
    crepes: {
      label: 'Crepes',
      kicker: 'From the Krampouz griddle',
      desc: 'Full crepes, not garnish. If it’s a strawberry crepe, you get a real amount of berries — not three pieces for the photo.',
      image: './assets/berry_bliss.webp' ,
      items: [
        { name:'The Berry Bliss', desc:'Nutella, Fresh Berries, Dark Chocolate', tags:'Sweet', price:'$13.00', image:'./assets/berry_bliss.webp' },
        { name:'Coco Bliss', desc:'Condensed Milk, Berries, Coconut Shavings, Chocolate Drizzle', tags:'Sweet', price:'$12.00', image:'./assets/coco.webp' },
        { name:'Nutella Banana', desc:'Nutella, Bananas, Chocolate Drizzles', tags:'Sweet', price:'$11.00',image:'./assets/banana_nutella.webp'  },
        { name:'The Fifth Ave Steak', desc:'Grilled Tri-Tip Steak, Cheese, Tomatoes, Marinated Onion and Spring Mix', tags:'House-Made Signature Sauce · Crafted Daily', price:'$8.00' },
        { name:'Naples Sunset Shrimp', desc:'Grilled Shrimp, Cheese, Arugula, Onion and Spring Mix', tags:'House-Made Signature Sauce · Crafted Daily', price:'$17.00' },
        { name:'Gulf Coast Chicken & Mushrooms', desc:'Grilled Chicken, Sauteed Mushrooms, Spring Mix, Cheese, Tomatoes and Onion', tags:'House-Made Signature Sauce · Crafted Daily', price:'$16.00' }, 
      ]
    },
    
    matcha: {
      label:'Matcha',
      kicker:'First- harvest matcha ',
      desc:'Matcha shipped from Kyoto, Japan every few weeks.',
      image: './assets/matcha.webp',
      items: [
        { name:'Iced Matcha', desc:'First-harvest Matcha ', tags:'Fresh', price:'$8.00', image:'./assets/matcha.webp' },
        { name:'Honey Lavender Matcha', desc:'Matcha, Real Honey', tags:'Fresh · Clean', price:'$8.00', image:'./assets/honey_matcha.webp' },
        { name:'Strawberry Matcha', desc:'Matcha, Strawberry Puree', tags:'Creamy · Cool', price:'$8.00' },
        { name:'Salted Maple Vanilla Matcha', desc:'Matcha, Salted Maple', tags:'Salted · Rich', price:'$8.00' },
        { name:'Blueberry Cream Matcha', desc:'Matcha, Blueberry', tags:'Creamy · Sweet', price:'$8.00' },
      ]
    },
    lemonade: {
      label:'Lemonade',
      kicker:'Freshly Squeezed Lemonade',
      desc:'Fresh - squeezed lemons.',
      image: './assets/lemonade.webp',
      items: [
        { name:'Classic Lemonade', desc:'Lemon, Freshly Squeezed', tags:'Bright · Fresh', price:'$7.00', image: './assets/lemonade.webp' },
        { name:'Blue Raspberry', desc:'Lemon, Blue Raspberry', tags:'Tropical · Fresh', price:'$8.00', image:'./assets/blue_raspberry.webp' },
        { name:'Jalapeno Lemonade', desc:'Lemon, Jalapeno', tags:'Spicy · Fresh', price:'$7.50' },
        { name:'Classic Lemonade with Flavor (Choose a flavor)', desc:'Mango, Cherry, Passionfruit, Pineapple, Raspberry, Strawberry, Rose, Grenadine, Lavender, Blueberry, Cranberry, Coconut, Peppermint', tags:'Tropical · Fresh', price:'$8.50' },
        { name:'Lotus Energy + Hydration (Lemonade Addition)', desc:'Energy + Hydrate', tags:'Lotus · Hydrate', price:'$3.00' },
        { name:'Sparkling Seltzer (Lemonade Addition)', desc:'Sparkling Seltzer', tags:'Sparkling', price:'$1.00' },
      ]
    },
    coffee: {
      label:'Coffee',
      kicker:'freshly roasted coffee',
      desc:'Freshly roasted by a local roaster',
      image: './assets/caramel_drizzle.webp',
      items: [
        { name:'Caramel Drizzle Latte', desc:'Caramel', tags:'Caramel Drizzle · Creamy', price:'$7.50', image: './assets/caramel_drizzle.webp' },
        { name:'Cookie Butter Latte', desc:'Cookie Butter', tags:'Creamy', price:'$7.50', image: './assets/coffee.webp' },
        { name:'Salted Maple Vanilla Latte', desc:'Salted Maple', tags:'Smooth · Salty', price:'$7.50', image: './assets/coffee.webp' },
        { name:'Banana Bread Latte', desc:'Banana', tags:'Fresh · Creamy', price:'$7.50', image: './assets/coffee.webp'},
        
      ]
    }
  };

  const pillRow = document.getElementById('pillRow');
  const menuImage = document.getElementById('menuImage');
  const menuKicker = document.getElementById('menuKicker');
  const menuTitle = document.getElementById('menuTitle');
  const menuDesc = document.getElementById('menuDesc');
  const menuItems = document.getElementById('menuItems');

  let activeCategory = 'crepes';

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

  function renderMenuPanel(){
    const cat = menu[activeCategory];
    menuImage.src = cat.image;
    menuImage.alt = cat.label + ' at Coastal Créperie';
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
        openItemModal(item, item.image || cat.image);
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

  function openItemModal(item, categoryImage){
    modalImage.src = categoryImage;
    modalImage.alt = item.name;
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

 