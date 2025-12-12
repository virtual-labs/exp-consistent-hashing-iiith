// CONSTANTS
// ---------

// DOM Elements will be initialized in main() function
let SIMULATION, BUTTONS_FORM, QUIZ_DIV, QUIZ_FORM, PARAMETERS_FORM;
let SELECT_EXPERIMENT, START_SIMULATION, STOP_SIMULATION;
let ITEMS_PLOT, MIGRATIONS_PLOT;
let START_AUDIO, STOP_AUDIO, PAUSE_AUDIO, ADJUST_AUDIO, SYNCHRONIZE_AUDIO;

// Canvas and styling constants will be set in main()
let HASHRING_X, HASHRING_Y, HASHRING_RADIUS;
const HASHRING_COLOR    = '#3182ce'; // VLabs Primary Blue
let HASHRING_WIDTH, MACHINE_WIDTH, ITEM_WIDTH, LEGEND_WIDTH, LEGEND_HEIGHT;
const MACHINE_COLOR     = '#4299e1'; // VLabs Primary Light Blue
const ITEM_COLOR        = '#10b981'; // VLabs Success Green
const MARKING_COLOR     = '#f59e0b'; // VLabs Warning Orange
const MAIN_FONT         = 'bold 18px Inter, system-ui, sans-serif';
const TEXT_FONT         = '12px Inter, system-ui, sans-serif';
const TEXT_COLOR        = '#2d3748'; // VLabs Dark Neutral
const BACKGROUND_COLOR  = '#f8fafc'; // VLabs Light Neutral
const MAX_INT53         = Math.pow(2, 53) - 1;
const DIV_INT53         = 1 / MAX_INT53;




// PARAMETERS
// ----------

/** Default parameters for the simulation. */
const PARAMETERS = {
  // Simulation parameters.
  initialMachines: 4,
  initialItems:    20,
  simulationSpeed: 10,
  quizProbability: 0,  // Set to 0 to prevent automatic pausing
  quizRetries:     3,
  // Machine parameters.
  virtualNodes:      1,
  machineUpdateTime: 15,  // Slower machine animations (was 10)
  // Item parameters.
  clickAdditions:  10,
  clickRemovals:   10,
  itemUpdateTime:  20,    // Slower item animations (was 10)
};


/** Machine/item types for the simulation. */
const UNUSED    = 0;
const ATTACHED  = 1;
const ATTACHING = 2;
const DETACHING = 3;
const MIGRATING_OUT = 4;
const MIGRATING_IN  = 5;




// TYPES
// -----

/**
 * Defines a machine in the simulation.
 */
class Machine {
  constructor(name, hash, speed, state=0) {
    this.isAttached = false;
    this.isMarked   = false;
    this.name  = name;
    this.hash  = hash;
    this.type  = ATTACHING;
    this.speed = speed;
    this.state = state;
    this.items = 0;
  }
}


/** Defines an item in the simulation. */
class Item {
  constructor(name, hash, speed) {
    this.isAttached = false;
    this.isMarked   = false;
    this.name   = name;
    this.hash   = hash;
    this.type   = ATTACHING;
    this.speed  = speed;
    this.state  = 0;
    this.owner  = '';
    this.source = '';
  }
}




/** Defines a consistent hash ring in the simulation. */
class ConsistentHashRing {
  constructor(onMigration) {
    this.itemMap     = new Map();
    this.machineMap  = new Map();
    this.ring        = [];
    this.items       = [];
    this.machines    = [];
    this.onMigration = onMigration || identity;
  }

  /** Reset the hash ring. */
  reset() {
    this.itemMap.clear();
    this.machineMap.clear();
    this.ring.length = 0;
    this.items.length = 0;
    this.machines.length = 0;
  }

  /** Update simulation state of the hash ring. */
  update(dt) {
    this.updateMachines(dt);
    this.updateItems(dt);
  }

  /** Draw the full state of the hash ring. */
  draw(ctx, x, y, r) {
    // Draw the hash ring with modern styling
    ctx.strokeStyle = HASHRING_COLOR;
    ctx.lineWidth   = HASHRING_WIDTH;
    ctx.shadowColor = 'rgba(124, 58, 237, 0.3)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Add inner glow effect
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.2)';
    ctx.lineWidth = HASHRING_WIDTH * 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Draw the items with enhanced modern styling
    for (var o of this.items) {
      var a = 2 * Math.PI * (o.hash * DIV_INT53);
      var u = x + r * (1.1 - 0.1 * o.state) * Math.cos(a);
      var v = y + r * (1.1 - 0.1 * o.state) * Math.sin(a);
      var w = (2 - o.state) * ITEM_WIDTH;
      
      // Create gradient for items based on their state
      var itemGradient = ctx.createRadialGradient(u, v, 0, u, v, w*2);
      
      if (o.type === DETACHING) {
        // Red gradient for items being removed
        itemGradient.addColorStop(0, '#fca5a5'); // Light red
        itemGradient.addColorStop(0.7, '#ef4444'); // Main red  
        itemGradient.addColorStop(1, '#dc2626'); // Dark red
        ctx.shadowColor = 'rgba(239, 68, 68, 0.7)'; // Red glow
        ctx.shadowBlur = 12;
      } else if (o.type === ATTACHING) {
        // Bright green gradient for items being added
        itemGradient.addColorStop(0, '#86efac'); // Very light green
        itemGradient.addColorStop(0.7, '#22c55e'); // Bright green
        itemGradient.addColorStop(1, '#16a34a'); // Dark green
        ctx.shadowColor = 'rgba(34, 197, 94, 0.7)'; // Bright green glow
        ctx.shadowBlur = 12;
      } else {
        // Normal green gradient for attached items
        itemGradient.addColorStop(0, '#34d399'); // Light green
        itemGradient.addColorStop(0.7, ITEM_COLOR); // Main green
        itemGradient.addColorStop(1, '#047857'); // Dark green
        ctx.shadowColor = 'rgba(16, 185, 129, 0.5)'; // Normal glow
        ctx.shadowBlur = 8;
      }
      
      ctx.fillStyle = itemGradient;
      
      // Draw the item with enhanced shapes
      if (o.isAttached && !o.isMarked) {
        // Draw as hexagon for attached items
        drawHexagon(ctx, u, v, w*1.5);
        ctx.fill();
        
        // Add border with color based on state
        if (o.type === DETACHING) {
          ctx.strokeStyle = '#dc2626'; // Dark red border
        } else if (o.type === ATTACHING) {
          ctx.strokeStyle = '#16a34a'; // Dark green border
        } else {
          ctx.strokeStyle = '#047857'; // Normal dark green
        }
        ctx.lineWidth = 2; // Thicker border for better visibility
        ctx.shadowBlur = 0;
        ctx.stroke();
      } else {
        // Draw as rounded rectangle for unattached items
        var itemWidth = 6*w;
        var itemHeight = 3*w;
        roundRect(ctx, u-itemWidth/2, v-itemHeight/2, itemWidth, itemHeight, w);
        ctx.fill();
        
        // Add border with color based on state
        if (o.type === DETACHING) {
          ctx.strokeStyle = '#dc2626'; // Dark red border
        } else if (o.type === ATTACHING) {
          ctx.strokeStyle = '#16a34a'; // Dark green border
        } else {
          ctx.strokeStyle = '#047857'; // Normal dark green
        }
        ctx.lineWidth = 2; // Thicker border for better visibility
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Draw item association with enhanced gradient lines
      if (o.isAttached && !o.isMarked && o.state < 1) {
        var m  = this.machineMap.get(o.owner);
        var ma = 2 * Math.PI * (m.hash * DIV_INT53);
        var mu = x + r * (1.1 - 0.1 * m.state) * Math.cos(ma);
        var mv = y + r * (1.1 - 0.1 * m.state) * Math.sin(ma);
        
        var connectionGradient = ctx.createLinearGradient(u, v, mu, mv);
        if (o.type === ATTACHING || o.type === MIGRATING_IN) {
          connectionGradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)'); // Bright green for adding
          connectionGradient.addColorStop(1, 'rgba(59, 130, 246, 0.9)'); // Blue
          ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
        } else if (o.type === DETACHING || o.type === MIGRATING_OUT) {
          connectionGradient.addColorStop(0, 'rgba(239, 68, 68, 0.9)'); // Red for removing
          connectionGradient.addColorStop(1, 'rgba(220, 38, 38, 0.9)'); // Dark red
          ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        } else {
          connectionGradient.addColorStop(0, 'rgba(245, 158, 11, 0.8)'); // Amber for normal
          connectionGradient.addColorStop(1, 'rgba(239, 68, 68, 0.8)'); // Red
          ctx.shadowColor = 'rgba(16, 185, 129, 0.3)';
        }
        
        ctx.strokeStyle = connectionGradient;
        ctx.lineWidth = 5; // Thicker lines for better visibility
        ctx.shadowBlur = 8;
        
        // Draw connection line with dashed effect for animation
        if (o.type === DETACHING) {
          ctx.setLineDash([8, 8]); // Longer dashes for detaching items
        } else {
          ctx.setLineDash([5, 5]); // Normal dashes
        }
        ctx.beginPath();
        ctx.moveTo(u, v);
        ctx.lineTo(mu, mv);
        ctx.stroke();
        
        // Reset line dash
        ctx.setLineDash([]);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
      
      // Draw the item name with better typography
      if (o.isMarked || !o.isAttached) {
        ctx.fillStyle = TEXT_COLOR;
        // Scale font size based on item width for responsive text
        const fontSize = Math.max(6, Math.min(12, w * 0.3));
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 2;
        ctx.fillText(o.name, u, v);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.font = TEXT_FONT;
      }
      
      // Draw markings with enhanced pulsing effect
      if (o.isMarked) {
        ctx.strokeStyle = MARKING_COLOR;
        ctx.lineWidth = 3;
        ctx.shadowColor = MARKING_COLOR;
        ctx.shadowBlur = 12;
        
        // Triple ring effect for items
        ctx.beginPath();
        ctx.arc(u, v, 3*w + 2, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(u, v, 3*w + 6, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.lineWidth = 1;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(u, v, 3*w + 10, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    }
    // Draw the machines with enhanced modern styling
    for (var m of this.machines) {
      var a = 2 * Math.PI * (m.hash * DIV_INT53);
      var u = x + r * (1.1 - 0.1 * m.state) * Math.cos(a);
      var v = y + r * (1.1 - 0.1 * m.state) * Math.sin(a);
      var w = (2 - m.state) * MACHINE_WIDTH;
      
      // Create gradient for machine based on state
      var machineGradient = ctx.createLinearGradient(u-3*w, v-w, u+3*w, v+w);
      
      if (m.type === DETACHING) {
        // Red gradient for machines being removed
        machineGradient.addColorStop(0, '#fca5a5'); // Light red
        machineGradient.addColorStop(0.5, '#ef4444'); // Main red
        machineGradient.addColorStop(1, '#dc2626'); // Dark red
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)'; // Red glow
        ctx.shadowBlur = 15;
      } else if (m.type === ATTACHING) {
        // Bright blue gradient for machines being added
        machineGradient.addColorStop(0, '#93c5fd'); // Light blue
        machineGradient.addColorStop(0.5, '#3b82f6'); // Bright blue
        machineGradient.addColorStop(1, '#1d4ed8'); // Dark blue
        ctx.shadowColor = 'rgba(59, 130, 246, 0.6)'; // Bright blue glow
        ctx.shadowBlur = 15;
      } else {
        // Normal blue gradient for attached machines
        machineGradient.addColorStop(0, '#60a5fa'); // Light blue
        machineGradient.addColorStop(0.5, MACHINE_COLOR); // Main blue
        machineGradient.addColorStop(1, '#1e40af'); // Dark blue
        ctx.shadowColor = 'rgba(59, 130, 246, 0.4)'; // Normal glow
        ctx.shadowBlur = 12;
      }
      
      ctx.fillStyle = machineGradient;
      
      // Draw machine as rounded rectangle with better proportions
      var machineWidth = 8*w;  // Increased from 6*w to 8*w
      var machineHeight = 3.5*w;  // Increased from 2.5*w to 3.5*w
      roundRect(ctx, u-machineWidth/2, v-machineHeight/2, machineWidth, machineHeight, w*0.8);
      ctx.fill();
      
      // Add border with color based on state
      if (m.type === DETACHING) {
        ctx.strokeStyle = '#dc2626'; // Dark red border
      } else if (m.type === ATTACHING) {
        ctx.strokeStyle = '#1d4ed8'; // Dark blue border
      } else {
        ctx.strokeStyle = '#1e40af'; // Normal dark blue
      }
      ctx.lineWidth = 2; // Thicker border for better visibility
      ctx.shadowBlur = 0;
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Draw machine name with better typography and centered positioning
      ctx.fillStyle = '#ffffff';
      // Scale font size based on machine width for responsive text (increased size)
      const fontSize = Math.max(12, Math.min(18, machineWidth * 0.4)); // Increased min from 10 to 12, max from 16 to 18
      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(m.name, u, v);
      
      // Draw markings with enhanced pulsing effect
      if (m.isMarked) {
        ctx.strokeStyle = MARKING_COLOR;
        ctx.lineWidth = 3;
        ctx.shadowColor = MARKING_COLOR;
        ctx.shadowBlur = 15;
        
        // Double ring effect
        ctx.beginPath();
        ctx.arc(u, v, machineWidth/2 + 4, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(u, v, machineWidth/2 + 8, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    }
    
    // Reset font
    ctx.font = TEXT_FONT;
  }

  /** Prepare to attach a machine to the hash ring. */
  addMachine(name) {
    var p = parameters;
    if (this.machineMap.has(name)) return;
    var hash  = cyrb53(name);
    var speed = 1 / (p.machineUpdateTime * (0.5 + Math.random()));
    var m = new Machine(name, hash, speed);
    this.machineMap.set(name, m);
    this.machines.push(m);
  }

  /** Attach a machine to the hash ring, immediately. */
  addMachineImmediate(name) {
    var p = parameters;
    if (this.machineMap.has(name)) return;
    var hash  = cyrb53(name);
    var speed = 1 / (p.machineUpdateTime * (0.5 + Math.random()));
    var m = new Machine(name, hash, speed, 1);
    this.machineMap.set(name, m);
    this.machines.push(m);
    this.attachMachine(m);
  }

  /** Prepare to detach a machine from the hash ring. */
  removeMachine(name) {
    var m  = this.getMachine(name);
    if (m) m.type = DETACHING;
  }

  /** Update the associated machines. */
  updateMachines(dt) {
    // Process machines that are being added.
    for (var m of this.machines) {
      if (m.type !== ATTACHING) continue;
      m.state = Math.min(m.state + dt * m.speed, 1);
      if (m.state >= 0.8) this.attachMachine(m);
      if (m.state >= 1)   m.type = ATTACHED;
    }
    // Process machines that are being removed.
    var I = this.machines.length;
    for (var i=0, j=0; i<I; ++i) {
      var m = this.machines[i];
      if (m.type !== DETACHING) { this.machines[j++] = m; continue; }
      m.state = Math.max(m.state - dt * m.speed, 0);
      if (m.state < 0.8) this.detachMachine(m);
      if (m.state > 0)   this.machines[j++] = m;
      else this.machineMap.delete(m.name);
    }
    this.machines.length = j;
  }

  /** Attach a machine to the hash ring. */
  attachMachine(m) {
    if (m.isAttached) return;
    m.isAttached = true;
    // Migrate some items to the machine.
    var l = this.findEarlierMachine(m.hash) || m;
    if (l.hash <= m.hash) {
      for (var o of this.items)
        if (o.hash > l.hash && o.hash <= m.hash) this.migrateItem(o, m);
    }
    else {
      for (var o of this.items)
        if (o.hash > l.hash || o.hash <= m.hash) this.migrateItem(o, m);
    }
    // Now, attach the machine to the hash ring.
    this.ring.push(m);
    this.ring.sort((a, b) => a.hash - b.hash);
    // Ask quiz question, if necessary.
    this.attachMachineQuiz(m);
  }

  /** Detach a machine from the hash ring. */
  detachMachine(m) {
    if (!m.isAttached) return;
    m.isAttached = false;
    // Detach the machine from the hash ring.
    var i = binarySearchBegin(this.ring, m.hash, (a, b) => a.hash - b);
    this.ring.splice(i, 1);
    // Now, migrate items from the machine to the next machine.
    var l = this.findEarlierMachine(m.hash) || m;
    var n = this.findLaterMachine(m.hash)   || m;
    if (l.hash <= m.hash) {
      for (var o of this.items)
        if (o.hash > l.hash && o.hash <= m.hash) this.migrateItem(o, n);
    }
    else {
      for (var o of this.items)
        if (o.hash > l.hash || o.hash <= m.hash) this.migrateItem(o, n);
    }
    // Ask quiz question, if necessary.
    this.detachMachineQuiz(m);
  }

  /** Get a machine by name. */
  getMachine(name) {
    return this.machineMap.get(name);
  }

  /** Get a random machine. */
  getRandomMachine() {
    var N = partition(this.machines, o => o.type !== DETACHING);
    var i = Math.floor(Math.random() * N);
    return this.machines[i];
  }

  /** Find the index of a machine on the ring, based on given hash. */
  searchMachine(hash) {
    return binarySearchBegin(this.ring, hash, (a, b) => a.hash - b);
  }

  /** Find a machine that is earlier on the ring, than the given hash. */
  findEarlierMachine(hash) {
    var i = binarySearchBegin(this.ring, hash, (a, b) => a.hash - b);
    return this.ring[mod(i-1, this.ring.length)];
  }

  /** Find a machine that is later on the ring, than the given hash. */
  findLaterMachine(hash) {
    var i = binarySearchEnd(this.ring, hash, (a, b) => a.hash - b);
    return this.ring[i % this.ring.length];
  }

  /** Get the number of machines. */
  machineCount() {
    return this.machines.length;
  }

  /** Get the number of attached machines. */
  attachedMachineCount() {
    return this.ring.length;
  }

  /** Get the number of items. */
  itemCount() {
    return this.items.length;
  }

  /** Get the number of attached items. */
  attachedItemCount() {
    return partition(this.items, o => o.isAttached);
  }

  /** Prepare to attach an item to the hash ring. */
  addItem(name) {
    var p = parameters;
    var hash  = cyrb53(name);
    var speed = 1 / (p.itemUpdateTime * (0.5 + Math.random()));
    var o = new Item(name, hash, speed);
    this.itemMap.set(name, o);
    this.items.push(o);
  }

  /** Prepare to remove n random items from the hash ring. */
  removeRandomItems(n) {
    var N = partition(this.items, o => o.type !== DETACHING);
    var n = Math.min(n, N);
    // Randomly select n items to remove.
    var undetached = this.items.slice(0, N);
    undetached.sort(() => Math.random() - 0.5);
    for (var i=0; i<n; ++i) {
      var o  = undetached[i];
      o.type = DETACHING;
    }
  }

  /** Update the associated items. */
  updateItems(dt) {
    // Process items that are being added.
    for (var o of this.items) {
      if (o.type !== ATTACHING) continue;
      o.state = Math.min(o.state + dt * o.speed, 1);
      if (o.state >= 0.8) this.attachItem(o);
      if (o.state >= 1)   o.type = ATTACHED;
    }
    // Process items that are being removed.
    var I = this.items.length;
    for (var i=0, j=0; i<I; ++i) {
      var o = this.items[i];
      if (o.type !== DETACHING) { this.items[j++] = o; continue; }
      o.state = Math.max(o.state - dt * o.speed, 0);
      if (o.state < 0.8) this.detachItem(o);
      if (o.state > 0)   this.items[j++] = o;
      else this.itemMap.delete(o.name);
    }
    this.items.length = j;
    // Process items that are being migrated in.
    for (var o of this.items) {
      if (o.type !== MIGRATING_IN) continue;
      o.state = Math.min(o.state + dt * o.speed, 1);
      if (o.state >= 0.8) this.attachItem(o);
      if (o.state >= 1)   o.type = ATTACHED;
    }
    // Process items that are being migrated out.
    for (var o of this.items) {
      if (o.type !== MIGRATING_OUT) continue;
      o.state = Math.max(o.state - dt * o.speed, 0);
      if (o.state <  0.8) this.detachItem(o);
      if (o.state <= 0)   o.type = MIGRATING_IN;
    }
  }

  /** Attach an item to the hash ring. */
  attachItem(o) {
    if (o.isAttached) return;
    o.isAttached = true;
    var m = this.findLaterMachine(o.hash);
    o.owner = m.name;
    m.items += 1;
    // Notify of migration, if necessary.
    if (o.source && o.source !== m.name) this.onMigration(o, o.source, m.name);
    // Ask quiz question, if necessary.
    this.attachItemQuiz(o);
  }

  /** Detach an item from the hash ring. */
  detachItem(o) {
    if (!o.isAttached) return;
    o.isAttached = false;
    // Ask quiz question, if necessary.
    this.detachItemQuiz(o);
    // Detach the item from the hash ring.
    var m = this.getMachine(o.owner);
    o.owner = '';
    m.items -= 1;
  }

  /** Prepare an item to migrate to a machine. */
  migrateItem(o, m) {
    if (o.owner === m.name) return;
    o.source = o.owner;
    o.type   = MIGRATING_OUT;
  }

  /** Get an item by name. */
  getItem(name) {
    return this.itemMap.get(name);
  }

  /** Ask a quiz question when a machine is attached. */
  attachMachineQuiz(m) {
    var s = simulation;
    var p = parameters;
    if (Math.random() > p.quizProbability) return;
    var r = Math.floor(2 * Math.random());
    m.isMarked = true;
    s.quizHandler = () => { m.isMarked = false; };
    if (r===0) askQuiz(`How many virtual nodes does machine ${baseMachineName(m.name)} have?`, p.virtualNodes);
    else       askQuiz(`To which machine does the virtual node of ${m.name} belong?`, baseMachineName(m.name));
  }

  /** Ask a quiz question when a machine is detached. */
  detachMachineQuiz(m) {
    var s = simulation;
    var p = parameters;
    if (Math.random() > p.quizProbability) return;
    m.isMarked = true;
    s.quizHandler = () => { m.isMarked = false; };
    askQuiz(`How many items were assigned to machine ${baseMachineName(m.name)}?`, `${m.items}`, m);
  }

  /** Ask a quiz question when an item is attached. */
  attachItemQuiz(o) {
    var s = simulation;
    var p = parameters;
    if (Math.random() > p.quizProbability) return;
    o.isMarked = true;
    s.quizHandler = () => { o.isMarked = false; };
    askQuiz(`To which machine will item ${o.name} be assigned?`, baseMachineName(o.owner), o);
  }

  /** Ask a quiz question when an item is detached. */
  detachItemQuiz(o) {
    var s = simulation;
    var p = parameters;
    if (Math.random() > p.quizProbability) return;
    o.isMarked = true;
    s.quizHandler = () => { o.isMarked = false; };
    askQuiz(`From which machine was item ${o.name} removed?`, baseMachineName(o.owner), o);
  }
}




/** Defines a naive hash ring in the simulation. */
class NaiveHashRing {
  constructor(onMigration) {
    this.machineMap  = new Map();
    this.machines    = [];
    this.items       = [];
    this.onMigration = onMigration || identity;
  }


  /** Reset the hash ring. */
  reset() {
    this.machineMap.clear();
    this.machines.length = 0;
    this.items.length = 0;
  }


  /** Add a machine to the hash ring. */
  addMachine(name) {
    if (this.machineMap.has(name)) return;
    var hash = cyrb53(name);
    var m = new Machine(name, hash, 1);
    this.machineMap.set(name, m);
    this.machines.push(m);
    this.migrateItems();
  }


  /** Remove a machine from the hash ring. */
  removeMachine(name) {
    var m = this.getMachine(name);
    if (!m) return;
    this.machineMap.delete(name);
    var i = this.machines.indexOf(m);
    this.machines.splice(i, 1);
    this.migrateItems();
  }


  /** Remove a random machine from the hash ring. */
  removeRandomMachine() {
    var N = this.machines.length;
    if (N === 0) return;
    var i = Math.floor(Math.random() * N);
    var m = this.machines[i];
    this.machineMap.delete(m.name);
    this.machines.splice(i, 1);
    this.migrateItems();
  }


  /** Add an item to the hash ring. */
  addItem(name) {
    var hash = cyrb53(name);
    var o    = new Item(name, hash, 1);
    this.items.push(o);
    // Attach the item to the appropriate machine.
    var i = Math.floor((hash / MAX_INT53) * this.machines.length);
    var m = this.machines[i];
    o.owner  = m.name;
    m.items += 1;
  }


  /** Remove n random items from the hash ring. */
  removeRandomItems(n) {
    var N = this.items.length;
    var n = Math.min(n, N);
    // Randomly select n items to remove.
    this.items.sort(() => Math.random() - 0.5);
    for (var i=0; i<n; ++i) {
      var o = this.items.pop();
      var m = this.getMachine(o.owner);
      m.items -= 1;
    }
  }


  /** Migrate items in the hash ring. */
  migrateItems() {
    var N = this.items.length;
    // Randomly select n items to migrate.
    for (var i=0; i<N; ++i) {
      var o = this.items[i];
      var l = this.getMachine(o.owner);
      // Attach the item to the appropriate machine.
      var j = Math.floor((o.hash / MAX_INT53) * this.machines.length);
      var m = this.machines[j];
      if (o.owner !== m.name) this.onMigration(o, o.owner, m.name);
      o.owner  = m.name;
      if (l) l.items -= 1;
      m.items += 1;
    }
  }


  /** Get a machine by name. */
  getMachine(name) {
    return this.machineMap.get(name);
  }
}




// STATE
// -----

/** Parameters for the simulation. */
var parameters = Object.assign({}, PARAMETERS);

/** State of the simulation. */
var simulation = {
  isRunning: false,
  isPaused:  false,
  isResumed: false,
  timestamp: 0,
  time: 0,
  lastMachine: 0,
  lastItem: 0,
  quizFailed: 0,
  quizQuestion: '',
  quizAnswer: '',
  quizHandler: null,
};

/** Consistent hash ring for the simulation. */
var hashring = new ConsistentHashRing(handleHashringMigration);
var hashringMigrations = new Map();

/** Naive hash ring for the simulation. */
var naivering = new NaiveHashRing(handleNaiveringMigration);
var naiveringMigrations = new Map();

/** Array to track all migrations with details */
var migrationHistory = [];

/** Current action identifier for grouping migrations */
var currentMigrationAction = null;

/** Plot of items vs machines. */
var itemsPlot = null;

/** Plot of migrations vs machines. */
var migrationsPlot = null;

/** Images for the simulation. */
var images = {
  isLoaded: false,
};




// METHODS
// -------

/** Main function. */
function main() {
  // Initialize DOM elements
  SIMULATION        = document.querySelector('#arena');
  BUTTONS_FORM      = document.querySelector('#control-form');
  QUIZ_DIV          = document.querySelector('#quiz');
  QUIZ_FORM         = document.querySelector('#quiz form');
  PARAMETERS_FORM   = document.querySelector('#parameters-form');
  SELECT_EXPERIMENT = document.querySelector('#select-experiment');
  START_SIMULATION  = document.querySelector('#start-simulation');
  STOP_SIMULATION   = document.querySelector('#stop-simulation');
  ITEMS_PLOT        = document.querySelector('#items-plot');
  MIGRATIONS_PLOT   = document.querySelector('#migrations-plot');
  START_AUDIO       = document.querySelector('#start-audio');
  STOP_AUDIO        = document.querySelector('#stop-audio');
  PAUSE_AUDIO       = document.querySelector('#pause-audio');
  ADJUST_AUDIO      = document.querySelector('#adjust-audio');
  SYNCHRONIZE_AUDIO = document.querySelector('#synchronize-audio');

  // Initialize canvas-dependent constants
  if (SIMULATION) {
    // Function to resize canvas responsively
    function resizeCanvas() {
      const container = SIMULATION.parentElement;
      const containerRect = container.getBoundingClientRect();
      console.log('Container size:', containerRect.width, 'x', containerRect.height);
      
      // Use the full container dimensions to make it fill the square container
      const availableWidth = containerRect.width - 4; // Account for border only
      const availableHeight = containerRect.height - 4; // Account for border only
      
      // Use the smaller dimension to ensure it fits properly in the container
      const canvasSize = Math.min(availableWidth, availableHeight);
      
      SIMULATION.width = canvasSize;
      SIMULATION.height = canvasSize;
      
      // Set the CSS size to fill the container
      SIMULATION.style.width = '100%';
      SIMULATION.style.height = '100%';
      
      HASHRING_X        = SIMULATION.width  / 2;
      HASHRING_Y        = SIMULATION.height / 2; // Center the ring
      
      // Make the circle as large as possible within the canvas
      HASHRING_RADIUS   = (canvasSize / 2) - 20; // Leave some margin for the ring
      
      HASHRING_WIDTH    = SIMULATION.width / 200;
      MACHINE_WIDTH     = SIMULATION.width / 180;
      ITEM_WIDTH        = SIMULATION.width / 200;
      LEGEND_WIDTH      = SIMULATION.width / 5;
      LEGEND_HEIGHT     = SIMULATION.width / 30;
      
      console.log('Canvas resized:', SIMULATION.width, 'x', SIMULATION.height);
      console.log('Hash ring radius:', HASHRING_RADIUS);
    }
    
    // Initial resize
    resizeCanvas();
    
    // Additional resize after a short delay to ensure container is fully rendered
    setTimeout(resizeCanvas, 100);
    
    // Resize on window resize
    window.addEventListener('resize', resizeCanvas);
    
    console.log('Canvas initialized:', SIMULATION.width, 'x', SIMULATION.height);
    console.log('Machine width:', MACHINE_WIDTH);
  } else {
    console.error('Canvas element not found!');
  }

  Chart.register(ChartDataLabels);  // Enable chart data labels
  BUTTONS_FORM.addEventListener('submit', onFormSubmit);
  QUIZ_FORM.addEventListener('submit', onFormSubmit);
  PARAMETERS_FORM.addEventListener('submit', onFormSubmit);
  
  // Instructions modal event listeners
  const instructionsBtn = document.getElementById('instructionsBtn');
  const instructionsModal = document.getElementById('instructionsModal');
  const closeModal = document.getElementById('closeModal');
  
  if (instructionsBtn && instructionsModal && closeModal) {
    instructionsBtn.addEventListener('click', () => {
      instructionsModal.classList.remove('hidden');
      console.log('Modal opened');
    });
    
    closeModal.addEventListener('click', (e) => {
      e.stopPropagation();
      instructionsModal.classList.add('hidden');
      console.log('Modal closed via X button');
    });
    
    // Close modal when clicking outside - improved version
    instructionsModal.addEventListener('click', (e) => {
      console.log('Modal clicked:', e.target.className);
      if (e.target.classList.contains('modal-backdrop')) {
        instructionsModal.classList.add('hidden');
        console.log('Modal closed via outside click');
      }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!instructionsModal.classList.contains('hidden')) {
          instructionsModal.classList.add('hidden');
          console.log('Instructions modal closed via Escape key');
        }
        const migrationsModal = document.getElementById('migrationsModal');
        if (migrationsModal && !migrationsModal.classList.contains('hidden')) {
          migrationsModal.classList.add('hidden');
          console.log('Migrations modal closed via Escape key');
        }
      }
    });
  } else {
    console.error('Modal elements not found:', {instructionsBtn, instructionsModal, closeModal});
  }
  
  // Setup migration modal
  setupMigrationModal();
  
  setTimeout(stopSimulation, 500);  // Let some rendering happen
  requestAnimationFrame(simulationLoop);
  drawButtons();
  drawPlots();
  setInterval(drawPlots, 1000);
}

// Ensure DOM is loaded before running main
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}


/** Main simulation loop. */
function simulationLoop(timestamp) {
  var s = simulation;
  if (!s.isRunning || s.isPaused) return;
  if (s.isResumed) {
    s.timestamp = timestamp;
    s.isResumed = false;
  }
  else updateSimulation(timestamp);
  renderSimulation();
  requestAnimationFrame(simulationLoop);
}


/** Update the simulation state. */
function updateSimulation(timestamp) {
  var s = simulation;
  var p = parameters;
  // Update simulation time.
  var dt = 0.001 * p.simulationSpeed * (timestamp - s.timestamp);
  s.timestamp = timestamp;
  s.time     += dt;
  hashring.update(dt);
}


/** Count number of items migrated to/from each machine, on the consistent hash ring. */
function handleHashringMigration(o, lname, mname) {
  var hm = hashringMigrations;
  lname  = baseMachineName(lname);
  mname  = baseMachineName(mname);
  hm.set(lname, (hm.get(lname) || 0) + 1);
  hm.set(mname, (hm.get(mname) || 0) + 1);
  
  // Track detailed migration information
  migrationHistory.push({
    item: o.name,
    from: lname,
    to: mname,
    timestamp: new Date().toLocaleTimeString(),
    type: 'consistent',
    action: currentMigrationAction || { id: Date.now(), description: 'Unknown action', timestamp: new Date().toLocaleTimeString() }
  });
  
  // Update the migration count display
  updateMigrationCount();
}


/** Count number of items migrated to/from each machine, on the naive hash ring. */
function handleNaiveringMigration(o, lname, mname) {
  var nm = naiveringMigrations;
  nm.set(lname, (nm.get(lname) || 0) + 1);
  nm.set(mname, (nm.get(mname) || 0) + 1);
  
  // Track detailed migration information
  migrationHistory.push({
    item: o.name,
    from: lname,
    to: mname,
    timestamp: new Date().toLocaleTimeString(),
    type: 'naive',
    action: currentMigrationAction || { id: Date.now(), description: 'Unknown action', timestamp: new Date().toLocaleTimeString() }
  });
  
  // Update the migration count display
  updateMigrationCount();
}


/** Called when "Controls" form is submitted. */
function onFormSubmit(e) {
  e.preventDefault();
  return false;
}


/** Called when "Select Experiment" dropdown is changed. */
function onSelectExperiment() {
  var p = parameters;
  playAudio(ADJUST_AUDIO);
  switch (SELECT_EXPERIMENT.value) {
    case '1': Object.assign(p, PARAMETERS, {virtualNodes: 1, quizProbability: 0}); break;
    case '2': Object.assign(p, PARAMETERS, {virtualNodes: 2, quizProbability: 0}); break;
    case '4': Object.assign(p, PARAMETERS, {virtualNodes: 4, quizProbability: 0}); break;
    case '8': Object.assign(p, PARAMETERS, {virtualNodes: 8, quizProbability: 0}); break;
    default:  Object.assign(p, PARAMETERS, {quizProbability: 0}); break;
  }
  stopSimulation();
  drawParameters();
}


/** Called when "Start Simulation" button is clicked. */
function onStartSimulation() {
  var s = simulation;
  if (!s.isRunning) adjustParameters(true);
  if (!s.isRunning) initSimulation();
  if (!s.isRunning) playAudio(START_AUDIO);
  else playAudio(PAUSE_AUDIO);
  s.isPaused  = s.isRunning? !s.isPaused : false;
  s.isResumed = !s.isPaused;
  s.isRunning = true;
  if (s.isResumed) resetQuiz();
  requestAnimationFrame(simulationLoop);
  drawButtons();
}


/** Called when "Stop Simulation" button is clicked. */
function onStopSimulation() {
  playAudio(STOP_AUDIO);
  stopSimulation();
}


/** Called when "Adjust Parameters" button is clicked. */
function onAdjustParameters() {
  playAudio(ADJUST_AUDIO);
  adjustParameters();
  drawParameters();
}


/** Called when "Reset Parameters" button is clicked. */
function onResetParameters() {
  playAudio(ADJUST_AUDIO);
  drawParameters();
}


/** Called when "Add Machine" button is clicked. */
function onAddMachine() {
  var h = hashring;
  var n = naivering;
  var s = simulation;
  var p = parameters;
  
  // Get number of machines to add from input field
  var machinesInput = document.querySelector('input[name="machines-per-click"]');
  var machineCount = parseInt(machinesInput.value) || 1;
  
  // Add multiple machines based on input value
  for (var j = 0; j < machineCount; j++) {
    var name = 'm' + s.lastMachine; 
    s.lastMachine++;
    
    // Set migration action context
    currentMigrationAction = {
      id: Date.now() + j,
      description: `Machine ${name} added`,
      timestamp: new Date().toLocaleTimeString()
    };
    
    // Add virtual nodes for this machine
    for (var i = 0; i < p.virtualNodes; ++i) {
      h.addMachine(name + '.' + i);
    }
    n.addMachine(name);
  }
  
  // Clear action context after animation completes (itemUpdateTime is ~20 seconds)
  setTimeout(() => { currentMigrationAction = null; }, 25000);
  
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Called when "Remove Machine" button is clicked. */
function onRemoveMachine() {
  var h = hashring;
  var n = naivering;
  var p = parameters;
  
  // Get number of machines to remove from input field
  var machinesInput = document.querySelector('input[name="machines-per-click"]');
  var machineCount = parseInt(machinesInput.value) || 1;
  
  // Remove multiple machines based on input value
  for (var j = 0; j < machineCount; j++) {
    // Get a random machine to remove
    var randomMachine = h.getRandomMachine();
    if (!randomMachine) break; // No more machines to remove
    
    var name = baseMachineName(randomMachine.name);
    
    // Set migration action context
    currentMigrationAction = {
      id: Date.now() + j,
      description: `Machine ${name} removed`,
      timestamp: new Date().toLocaleTimeString()
    };
    
    // Remove virtual nodes for this machine
    for (var i = 0; i < p.virtualNodes; ++i) {
      h.removeMachine(name + '.' + i);
    }
    n.removeMachine(name);
  }
  
  // Clear action context after animation completes (itemUpdateTime is ~20 seconds)
  setTimeout(() => { currentMigrationAction = null; }, 25000);
  
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Called when "Add Items" button is clicked. */
function onAddItems() {
  var h = hashring;
  var n = naivering;
  var p = parameters;
  var s = simulation;
  for (var i=0; i<p.clickAdditions; ++i, ++s.lastItem) {
    var name = 'o' + s.lastItem;
    h.addItem(name);
    n.addItem(name);
  }
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Called when "Remove Items" button is clicked. */
function onRemoveItems() {
  var h = hashring;
  var n = naivering;
  var p = parameters;
  h.removeRandomItems(p.clickRemovals);
  n.removeRandomItems(p.clickRemovals);
  playAudio(SYNCHRONIZE_AUDIO);
}


/** Pause the current simulation. */
function pauseSimulation() {
  var s = simulation;
  s.isPaused = true;
  s.isResumed = false;
  drawButtons();
}


/** Resume the current simulation. */
function resumeSimulation() {
  var s = simulation;
  s.isPaused = false;
  s.isResumed = true;
  requestAnimationFrame(simulationLoop);
  drawButtons();
}


/** Stop the current simulation. */
function stopSimulation() {
  resetSimulation();
  renderSimulation();
  drawButtons();
  resetQuiz();
}


/** Initialize the simulation. */
function initSimulation() {
  var h = hashring;
  var n = naivering;
  var p = parameters;
  var s = simulation;
  resetSimulation();
  // Add initial machines.
  for (var i=0; i<p.initialMachines; ++i, ++s.lastMachine) {
    var name = 'm' + i;
    for (var j=0; j<p.virtualNodes; ++j)
      h.addMachineImmediate(name + '.' + j);
    n.addMachine(name);
  }
  // Add initial items.
  for (var i=0; i<p.initialItems; ++i) {
    h.addItem('o' + i);
    n.addItem('o' + i);
  }
}


/** Reset the simulation. */
function resetSimulation() {
  var h  = hashring;
  var n  = naivering;
  var s  = simulation;
  var hm = hashringMigrations;
  var nm = naiveringMigrations;
  s.isRunning = false;
  s.isPaused  = false;
  s.isResumed = true;
  s.timestamp = 0;
  s.time      = 0;
  s.lastMachine = 0;
  s.lastItem    = 0;
  s.quizFailed   = 0;
  s.quizQuestion = '';
  s.quizAnswer   = '';
  s.quizHandler  = null;
  hm.clear();
  nm.clear();
  h.reset();
  n.reset();
  // Clear migration history when resetting
  migrationHistory.length = 0;
  updateMigrationCount();
}


/** Adjust parameters based on form input. */
function adjustParameters(fresh=false) {
  var p = parameters;
  var data = new FormData(PARAMETERS_FORM);
  if (fresh) formNumber(data, 'initial-machines', x => p.initialMachines = x);
  if (fresh) formNumber(data, 'initial-items',    x => p.initialItems = x);
  if (fresh) formNumber(data, 'virtual-nodes',    x => p.virtualNodes = x);
  formNumber(data, 'click-additions',  x => p.clickAdditions = x);
  formNumber(data, 'click-removals',   x => p.clickRemovals = x);
}


/** Hide the quiz form. */
function resetQuiz() {
  var s = simulation;
  s.quizFailed   = 0;
  s.quizQuestion = '';
  s.quizAnswer   = '';
  if (s.quizHandler) {
    s.quizHandler();
    s.quizHandler = null;
  }
  QUIZ_DIV.setAttribute('hidden', '');
}


/** Ask a quiz question. */
function askQuiz(question, answer) {
  var s = simulation;
  pauseSimulation();
  s.quizQuestion = question;
  s.quizAnswer   = answer;
  QUIZ_FORM.querySelector('label').textContent = question;
  QUIZ_FORM.querySelector('input[name="answer"]').value = '';
  QUIZ_DIV.removeAttribute('hidden');
}


/** Called when "Submit Quiz" button is clicked. */
function onSubmitQuiz() {
  var s = simulation;
  var p = parameters;
  var answer = QUIZ_FORM.querySelector('input[name="answer"]').value;
  if (answer === s.quizAnswer) {
    s.quizFailed = 0;
    if (s.quizHandler) { s.quizHandler(); s.quizHandler = null; }
    QUIZ_FORM.querySelector('label').textContent = `${s.quizQuestion} ✔️ (Correct)`;
    playAudio(START_AUDIO);
    setTimeout(() => {
      QUIZ_DIV.setAttribute('hidden', '');
      resumeSimulation();
    }, 1000);
  }
  else {
    s.quizFailed++;
    var question = s.quizQuestion;
    var label = s.quizFailed > p.quizRetries? `${question} (Answer: ${s.quizAnswer})` : `${question} ❌ (Try again)`;
    QUIZ_FORM.querySelector('label').textContent = label;
    playAudio(STOP_AUDIO);
  }
}


/** Update the paramter values in the form. */
function drawParameters() {
  var p = parameters;
  PARAMETERS_FORM.querySelector('input[name="initial-machines"]').value = p.initialMachines;
  PARAMETERS_FORM.querySelector('input[name="initial-items"]').value    = p.initialItems;
  PARAMETERS_FORM.querySelector('input[name="virtual-nodes"]').value    = p.virtualNodes;
  PARAMETERS_FORM.querySelector('input[name="click-additions"]').value  = p.clickAdditions;
  PARAMETERS_FORM.querySelector('input[name="click-removals"]').value   = p.clickRemovals;
}


/** Render the simulation. */
function renderSimulation() {
  var i = images;
  var h = hashring;
  var p = parameters;
  if (!i.isLoaded) loadImages();
  var ctx  = SIMULATION.getContext('2d');
  ctx.font = TEXT_FONT;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  
  drawBackground(ctx);
  hashring.draw(ctx, HASHRING_X, HASHRING_Y, HASHRING_RADIUS);
  
  // Draw modern legend with rounded rectangles and shadows
  drawModernLegend(ctx, h, p);
}


/** Draw the simulation background. */
function drawBackground(ctx) {
  // Create a subtle gradient background that adapts to canvas size
  var gradient = ctx.createRadialGradient(
    HASHRING_X, HASHRING_Y, 0,
    HASHRING_X, HASHRING_Y, HASHRING_RADIUS * 1.5
  );
  gradient.addColorStop(0, '#faf5ff'); // Very light purple center
  gradient.addColorStop(1, '#f1f5f9'); // Light gray edges
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** Draw modern legend and title */
function drawModernLegend(ctx, h, p) {
  // Title at the top center
  ctx.font = MAIN_FONT;
  ctx.fillStyle = '#7c3aed'; // Purple
  ctx.textAlign = 'center';
  ctx.fillText('🔄 Consistent Hash Ring', HASHRING_X, 40); // Adjusted for centered layout
  
  // Draw machine and items stats at center of hash ring
  var statsX = HASHRING_X;
  var statsY = HASHRING_Y - 12;
  var itemSpacing = 25;
  
  // Machine count
  ctx.textAlign = 'center';
  ctx.font = '14px Inter, system-ui, sans-serif';
  drawCenterLegendItem(ctx, statsX, statsY, MACHINE_COLOR, 'Machines', h.attachedMachineCount() / p.virtualNodes);
  
  // Item count
  drawCenterLegendItem(ctx, statsX, statsY + itemSpacing, ITEM_COLOR, 'Items', h.attachedItemCount());
  
  // Reset text alignment and font
  ctx.textAlign = 'center';
  ctx.font = TEXT_FONT;
}

/** Draw a legend item at center with modern styling */
function drawCenterLegendItem(ctx, x, y, color, label, count) {
  // Draw colored indicator circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - 60, y+3, 6, 0, 2 * Math.PI);
  ctx.fill();
  
  // Add subtle glow effect
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(x - 60, y +3, 6, 0, 2 * Math.PI);
  ctx.fill();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // Draw label and count
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = 'bold 16px Inter, system-ui, sans-serif'; // Increased from 14px to 16px
  ctx.fillText(label + ': ' + count, x, y + 4);
}

/** Helper function to draw rounded rectangles */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** Helper function to draw hexagon */
function drawHexagon(ctx, x, y, radius) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const xPos = x + radius * Math.cos(angle);
    const yPos = y + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(xPos, yPos);
    } else {
      ctx.lineTo(xPos, yPos);
    }
  }
  ctx.closePath();
}


/** Update buttons based on the current state of the simulation. */
function drawButtons() {
  var s = simulation;
  START_SIMULATION.textContent = !s.isRunning? 'Start Simulation' : s.isPaused? 'Resume Simulation' : 'Pause Simulation';
  STOP_SIMULATION.disabled     = !s.isRunning;
}


/** Draw the plots for the simulation. */
function drawPlots() {
  drawItemsPlot();
  drawMigrationsPlot();
}


/** Draw the items plot. */
function drawItemsPlot() {
  var h = hashring;
  var counts = new Map();
  for (var m of h.machines) {
    let name = baseMachineName(m.name);
    let n    = counts.get(name) || 0;
    counts.set(name, n + m.items);
  }
  var labels  = [...counts.keys()];
  var hvalues = [...counts.values()];
  itemsPlot = itemsPlot || new Chart(ITEMS_PLOT, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Consistent Hash',
        data: hvalues,
        backgroundColor: 'rgba(255, 132, 132, 1)',
        borderColor: 'rgba(255, 132, 132, 1)',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {title: {display: true, text: 'Machine'}},
        y: {title: {display: true, text: 'Item count'}, beginAtZero: true},
      }
    }
  });
  itemsPlot.data.labels = labels;
  itemsPlot.data.datasets[0].data = hvalues;
  itemsPlot.update();
}


/** Draw the migrations plot. */
function drawMigrationsPlot() {
  var hm = hashringMigrations;
  var nm = naiveringMigrations;
  var labels  = [...nm.keys()];
  var hvalues = labels.map(k => hm.get(k) || 0);
  var nvalues = labels.map(k => nm.get(k) || 0);
  migrationsPlot = migrationsPlot || new Chart(MIGRATIONS_PLOT, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Naive Hash',
        data: nvalues,
        backgroundColor: 'rgba(125, 199, 132, 1)',
        borderColor: 'rgba(25, 99, 132, 1)',
      }, {
        label: 'Consistent Hash',
        data: hvalues,
        backgroundColor: 'rgba(255, 132, 132, 1)',
        borderColor: 'rgba(255, 132, 132, 1)',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {title: {display: true, text: 'Machine'}},
        y: {title: {display: true, text: 'Migration count (to / from)'}, beginAtZero: true},
      }
    }
  });
  migrationsPlot.data.labels = labels;
  migrationsPlot.data.datasets[0].data = nvalues;
  migrationsPlot.data.datasets[1].data = hvalues;
  migrationsPlot.update();
}


/** Get the mouse position on an element. */
function getMousePos(el, ev) {
  var r  = el.getBoundingClientRect();
  var sx = el.width  / r.width;
  var sy = el.height / r.height;
  return {
    x: (ev.clientX - r.left) * sx,
    y: (ev.clientY - r.top)  * sy,
  };
}


/** Load images for simulation. */
function loadImages() {
  var i = images;
  i.isLoaded   = true;
}


/** Load an image. */
function loadImage(url) {
  var img = new Image();
  img.src = url;
  return img;
}


/** Play an audio element. */
function playAudio(el) {
  // Sound effects disabled for better user experience
  return;
}


/** Process a form number input. */
function formNumber(data, key, fn) {
  var x = parseFloat(data.get(key));
  if (!Number.isNaN(x)) fn(x);
}


/** Get the machine name, without virtual node index. */
function baseMachineName(name) {
  var i = name.indexOf('.');
  return i < 0? name : name.substring(0, i);
}


/** Find begin index of value using binary search. */
function binarySearchBegin(x, v, fc) {
  for (var i=0, I=x.length; i<I;) {
    var m = (i + I) >>> 1;
    var c = fc(x[m], v);
    if (c < 0) i = m + 1;
    else       I = m;
  }
  return i;
}


/** Find end index of value using binary search. */
function binarySearchEnd(x, v, fc) {
  for (var i=0, I=x.length; i<I;) {
    var m = (i + I) >>> 1;
    var c = fc(x[m], v);
    if (c <= 0) i = m + 1;
    else        I = m;
  }
  return i;
}


/** Partition an array, in-place, using a test function. */
function partition(x, ft) {
  for (var i=0, j=0, I=x.length; i<I; ++i) {
    if (!ft(x[i], i, x)) continue;
    var t  = x[i];
    x[i]   = x[j];
    x[j++] = t;
  }
  return j;
}


/** Find the remainder of x/y with +ve sign (euclidean division). */
function mod(x, y) {
  return x - y * Math.floor(x / y);
}


/** Identity function. */
function identity(x) {
  return x;

}


// MIGRATION HISTORY FUNCTIONS
// ----------------------------

/** Update the migration count badge */
function updateMigrationCount() {
  const countElement = document.getElementById('migrationCount');
  const countElementMobile = document.getElementById('migrationCountMobile');
  if (countElement) {
    countElement.textContent = migrationHistory.length;
  }
  if (countElementMobile) {
    countElementMobile.textContent = migrationHistory.length;
  }
}

/** Render the migrations list in the modal */
function renderMigrationsList() {
  const migrationsList = document.getElementById('migrationsList');
  const totalMigrations = document.getElementById('totalMigrations');
  
  if (!migrationsList || !totalMigrations) return;
  
  totalMigrations.textContent = migrationHistory.length;
  
  if (migrationHistory.length === 0) {
    migrationsList.innerHTML = '<p class="text-gray-500 text-center py-8">No migrations recorded yet. Start the simulation to see migrations.</p>';
    return;
  }
  
  // Group migrations by action
  const groupedMigrations = {};
  migrationHistory.forEach(migration => {
    const actionId = migration.action.id;
    if (!groupedMigrations[actionId]) {
      groupedMigrations[actionId] = {
        action: migration.action,
        migrations: []
      };
    }
    groupedMigrations[actionId].migrations.push(migration);
  });
  
  // Render grouped migrations in reverse order (newest first)
  const actionGroups = Object.values(groupedMigrations).reverse();
  migrationsList.innerHTML = actionGroups.map(group => `
    <div class="migration-action-group mb-4 bg-white border border-gray-200">
      <div class="migration-action-header bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <span class="text-gray-800">${group.action.description}</span>
          <span class="text-xs text-gray-500">${group.action.timestamp} • ${group.migrations.length} migration${group.migrations.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="migration-items-list p-2 space-y-1">
        ${group.migrations.map(migration => `
          <div class="migration-item-compact flex items-center justify-between p-2 bg-white rounded hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-2 flex-1">
              <span class="migration-item-name">${migration.item}</span>
              <div class="flex items-center gap-2 text-sm">
                <span class="migration-machine">${migration.from}</span>
                <svg class="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
                <span class="migration-machine">${migration.to}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/** Clear migration history */
function clearMigrationHistory() {
  if (confirm('Are you sure you want to clear all migration history?')) {
    migrationHistory.length = 0;
    updateMigrationCount();
    renderMigrationsList();
  }
}

/** Setup migration modal event listeners */
function setupMigrationModal() {
  const migrationsBtn = document.getElementById('migrationsBtn');
  const migrationsModal = document.getElementById('migrationsModal');
  const closeMigrationsModal = document.getElementById('closeMigrationsModal');
  
  if (!migrationsBtn || !migrationsModal || !closeMigrationsModal) return;
  
  // Open modal
  migrationsBtn.addEventListener('click', () => {
    migrationsModal.classList.remove('hidden');
    renderMigrationsList();
  });
  
  // Close modal
  closeMigrationsModal.addEventListener('click', () => {
    migrationsModal.classList.add('hidden');
  });
  
  // Close modal when clicking backdrop
  migrationsModal.addEventListener('click', (e) => {
    if (e.target === migrationsModal || e.target.classList.contains('modal-backdrop')) {
      migrationsModal.classList.add('hidden');
    }
  });
}


/**
 * cyrb53 (c) 2018 bryc (github.com/bryc)
 * License: Public domain (or MIT if needed). Attribution appreciated.
 * A fast and simple 53-bit string hash function with decent collision resistance.
 * Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
 */
function cyrb53(str, seed=0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for(let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
