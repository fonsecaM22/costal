let scheduleData = null;
let schedule = [];
let selectedIndex = 0;

const dayStrip = document.getElementById('dayStrip');
const stopName = document.getElementById('stopName');
const stopNote = document.getElementById('stopNote');
const stopAddress = document.getElementById('stopAddress');
const stopHours = document.getElementById('stopHours');
const mapsBtn = document.getElementById('mapsBtn');

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
      kicker: 'From the griddle',
      desc: 'Batter rested overnight, spun thin on a hot cast-iron griddle and folded to order.',
      image: './assets/crepe.webp' ,
      items: [
        { name:'Classic Sucre', desc:'Butter, cane sugar, fresh lemon', tags:'Bright · Simple', price:'$7.00' },
        { name:'Salted Caramel Banana', desc:'Caramelized banana, sea salt caramel, toasted almond', tags:'Sweet · Toasty', price:'$11.00' },
        { name:'Coastal Berry', desc:'Market berries, mascarpone cream, honey drizzle', tags:'Tart · Creamy', price:'$12.00' },
        { name:'Nutella Noisette', desc:'Hazelnut spread, banana, powdered sugar', tags:'Rich · Nutty', price:'$10.00' },
        { name:'Jambon & Gruyère', desc:'Black forest ham, aged gruyère, dijon cream', tags:'Savory · Sharp', price:'$13.00' },
        { name:'Garden Chèvre', desc:'Goat cheese, spinach, sun-dried tomato, basil', tags:'Herbal · Tangy', price:'$13.00' },
      ]
    },
    matcha: {
      label:'Matcha',
      kicker:'Ceremonial grade',
      desc:'Whisked to order from stone-ground matcha, sourced from a single farm in Uji.',
      image: './assets/matcha.webp',
      items: [
        { name:'Usucha', desc:'Thin-whisked ceremonial matcha, hot water', tags:'Grassy · Clean', price:'$6.00' },
        { name:'Iced Matcha Latte', desc:'Ceremonial matcha, whole milk, light honey', tags:'Creamy · Cool', price:'$7.50' },
        { name:'Coconut Matcha', desc:'Matcha, coconut cream, toasted coconut flake', tags:'Tropical · Rich', price:'$8.00' },
        { name:'Matcha Affogato', desc:'Vanilla soft-serve, double matcha shot', tags:'Bitter · Sweet', price:'$9.00' },
      ]
    },
    lemonade: {
      label:'Lemonade',
      kicker:'Pressed daily',
      desc:'Cold-pressed citrus, lightly sweetened, built to order over hand-cracked ice.',
      image: './assets/lemonade.webp',
      items: [
        { name:'Classic Pressed', desc:'Lemon, cane sugar, sparkling water', tags:'Bright · Fizzy', price:'$5.00' },
        { name:'Lavender Lemonade', desc:'Lemon, house lavender syrup', tags:'Floral · Calm', price:'$6.00' },
        { name:'Strawberry Basil', desc:'Muddled strawberry, basil, lemon', tags:'Sweet · Herbal', price:'$6.50' },
        { name:'Ginger Turmeric', desc:'Fresh ginger, turmeric, lemon, honey', tags:'Spiced · Warm', price:'$6.50' },
      ]
    },
    coffee: {
      label:'Coffee',
      kicker:'Slow brewed',
      desc:'Single-origin beans, roasted in small batches, brewed to order — no drip machines aboard.',
      image: './assets/coffee.webp',
      items: [
        { name:'Pour Over', desc:'Rotating single-origin, brewed to order', tags:'Clean · Bright', price:'$5.00' },
        { name:'Cortado', desc:'Double espresso, steamed milk, 1:1', tags:'Balanced · Bold', price:'$5.50' },
        { name:'Sea Salt Cold Brew', desc:'18-hour steep, sea salt cream float', tags:'Smooth · Rich', price:'$6.00' },
        { name:'Cardamom Latte', desc:'Espresso, steamed milk, house cardamom syrup', tags:'Spiced · Creamy', price:'$6.50' },
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