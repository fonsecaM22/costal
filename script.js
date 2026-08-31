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

function updateTodayCard(){
  const todayIndex = new Date().getDay();
  const todayStop = schedule[todayIndex];

  if (!todayStop || todayStop.closed){
    todayStopName.textContent = 'No Sevice Today';
    todayAddress.textContent = '';
    todayHours.textContent = 'Closed';
    return;
  }

  todayStopName.textContent = todayStop.name;
  todayAddress.textContent = todayStop.address;
  todayHours.textContent = todayStop.hours;
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

  stopName.textContent = stop.name;
  stopNote.textContent = stop.note;
  stopAddress.textContent = stop.address;
  stopHours.textContent = stop.hours;

  mapsBtn.style.display = 'inline-flex';

  mapsBtn.onclick = () => {
    const query = encodeURIComponent(stop.address);

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

  // ---- Menu ----
  const menu = {
    crepes: {
      label: 'Crepes',
      kicker: 'From the Krampouz griddle',
      desc: 'Full crepes, not garnish. If it’s a strawberry crepe, you get a real amount of berries — not three pieces for the photo.',
      image: './assets/crepe.heic' ,
      items: [
        { name:'The Berry Bliss', desc:'Nutella, Fresh Berries, Dark Chocolate', tags:'Sweet', price:'$13.00' },
        { name:'Coco Bliss', desc:'Condensed Milk, Berries, Coconut Shavings, Chocolate Drizzle', tags:'Sweet', price:'$12.00' },
        { name:'Nutella Banana', desc:'Nutella, Bananas, Chocolate Drizzles', tags:'Sweet', price:'$11.00' },
        { name:'The Fifth Ave Steak', desc:'Grilled Tri-Tip Steak, Cheese, Tomatoes, Marinated Onion and Spring Mix', tags:'House-Made Signature Sauce · Crafted Daily', price:'$8.00' },
        { name:'Naples Sunset Shrimp', desc:'Grilled Shrimp, Cheese, Arugula, Onion and Spring Mix', tags:'House-Made Signature Sauce · Crafted Daily', price:'$17.00' },
        { name:'Gulf Coast Chicken & Mushrooms', desc:'Grilled Chicken, Sauteed Mushrooms, Spring Mix, Cheese, Tomatoes and Onion', tags:'House-Made Signature Sauce · Crafted Daily', price:'$16.00' }, 
      ]
    },
    
    matcha: {
      label:'Matcha',
      kicker:'First- harvest matcha ',
      desc:'Matcha shipped from Kyoto, Japan every few weeks.',
      image: './assets/matcha-4.heic',
      items: [
        { name:'Honey Lavender Matcha', desc:'Matcha, Real Honey', tags:'Fresh · Clean', price:'$8.00' },
        { name:'Strawberry Matcha', desc:'Matcha, Strawberry Puree', tags:'Creamy · Cool', price:'$8.00' },
        { name:'Salted Maple Vanilla Matcha', desc:'Matcha, Salted Maple', tags:'Salted · Rich', price:'$8.00' },
        { name:'Blueberry Cream Matcha', desc:'Matcha, Blueberry', tags:'Creamy · Sweet', price:'$8.00' },
      ]
    },
    lemonade: {
      label:'Lemonade',
      kicker:'Freshly Squeezed Lemonade',
      desc:'Fresh - squeezed lemons.',
      image: './assets/lemonade-2.heic',
      items: [
        { name:'Classic Lemonade', desc:'Lemon, Freshly Squeezed', tags:'Bright · Fresh', price:'$7.00' },
        { name:'Blue Raspberry', desc:'Lemon, Blue Raspberry', tags:'Tropical · Fresh', price:'$8.00' },
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
      image: './assets/coffee-3.heic',
      items: [
        { name:'Caramel Drizzle Latte', desc:'Caramel', tags:'Caramel Drizzle · Creamy', price:'$7.50' },
        { name:'Cookie Butter Latte', desc:'Cookie Butter', tags:'Creamy', price:'$7.50' },
        { name:'Salted Maple Vanilla Latte', desc:'Salted Maple', tags:'Smooth · Salty', price:'$7.50' },
        { name:'Banana Bread Latte', desc:'Banana', tags:'Fresh · Creamy', price:'$7.50' },
        
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
        openItemModal(item, cat.image);
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