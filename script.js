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

  if (!schedule) {
    dayStrip.innerHTML = `
      <p>This week's schedule is coming soon. See our latest stops on <a href="https://streetfoodfinder.com/CoastalCreperie" target="_blank" rel="noopener">StreetFoodFinder</a>.</p>
    `;
    stopName.textContent = 'Schedule coming soon';
    stopNote.textContent = 'Follow us on Instagram or StreetFoodFinder for this week\'s stops.';
    stopAddress.textContent = '';
    stopHours.textContent = '';
    mapsBtn.style.display = 'none';
    todayStopName.textContent = 'Find us on StreetFoodFinder';
    todayAddress.textContent = 'streetfoodfinder.com/CoastalCreperie';
    todayHours.textContent = '';

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
  if (!schedule || !schedule.length) return;

  updateTodayCard();
  updatePanel();
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
        { name:'Campfire S’more', desc:'Nutella, Graham Crackers, Marshmallows', tags:'Sweet', price:'$12.00', image:'./assets/smores.jpg' },
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
      desc:'Freshly roasted by a local roaster. All lattes are 16oz. All signature lattes are $7.50.',
      image: './assets/caramel_drizzle.webp',
      items: [
        { name:'Espresso', desc:'Classic', tags:'Classics', price:'$4.00' },
        { name:'Cappuccino', desc:'Classic', tags:'Classics', price:'$6.00' },
        { name:'Latte', desc:'Classic, 16oz', tags:'Classics', price:'$6.00' },
        { name:'Americano', desc:'Classic', tags:'Classics', price:'$5.00' },
        { name:'Mocha', desc:'Classic, 16oz', tags:'Classics', price:'$7.00' },
        { name:'Hot Chocolate', desc:'Classic', tags:'Classics', price:'$6.00' },
        { name:'Cookie Butter Latte', desc:'Cookie Butter, 16oz', tags:'Signature Latte', price:'$7.50', image: './assets/coffee.webp' },
        { name:'Caramel Drizzle Latte', desc:'Caramel, 16oz', tags:'Signature Latte', price:'$7.50', image: './assets/caramel_drizzle.webp' },
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
      desc:'Matcha shipped from Kyoto, Japan every few weeks. All matchas are 16oz. All signature matchas are $8.',
      image: './assets/matcha.webp',
      items: [
        { name:'Matcha', desc:'First-harvest Matcha, 16oz', tags:'Fresh', price:'$7.00', image:'./assets/matcha.webp' },
        { name:'Islamorada Matcha', desc:'Mango + Guava', tags:'Signature Matcha', price:'$8.00', image:'./assets/islamorada_matcha.jpg' },
        { name:'Jasmine Honey Matcha', desc:'Jasmine, Honey', tags:'Signature Matcha', price:'$8.00', image:'./assets/honey_matcha.webp' },
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

  function renderMenuPanel(){
    const cat = menu[activeCategory];
    menuImage.loading = 'eager';
    menuImage.decoding = 'async';
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

 