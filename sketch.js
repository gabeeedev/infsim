BarWidth = 320;

Population = 500;

GlobalSettings = {};
Sliders = [];

function setupSlider(min, max, val, step, title, global, map, unit, rt = false, fixed = 0) {

  GlobalSettings[global] = val;

  pos = 64 + Sliders.length * 48;
  titleDiv = createDiv(title);
  titleDiv.position(0, pos);
  titleDiv.size(BarWidth-64-32, 32);
  titleDiv.style("color", rt ? "#6CF" : "#DDD");
  titleDiv.style("font-size", "18px");
  titleDiv.parent(sideBar);

  valueDiv = createDiv(val*map + " " + unit);
  valueDiv.position(BarWidth-112, pos);
  valueDiv.size(64, 32);
  valueDiv.style("color", "#DDD");
  valueDiv.style("font-size", "18px");
  valueDiv.style("text-align", "right");
  valueDiv.parent(sideBar);

  slider = createSlider(min, max, val, step);
  slider.position(0, pos + 20);
  slider.size(BarWidth-48, 16);
  slider.parent(sideBar);

  Sliders.push({
    "slider": slider,
    "valueDiv":valueDiv,
    "global": global,
    "map":map,
    "unit":unit,
    "fixed":fixed
  });
}

function global(s) {
  return GlobalSettings[s];
}

function betweenPoints(p, min, max) {
  return p.x > min.x && p.x < max.x && p.y > min.y && p.y < max.y;
}

class Nav {
  constructor() {
    this.people = [];
    this.free = [];
  }

  add(p) {
    if (this.free.length > 0) {
      let i = this.free.pop();
      this.people[i] = p
      return i;
    } else {
      this.people.push(p);
      return this.people.length-1;
    }
  }

  remove(i) {
    this.people[i] = null;
    this.free.push(i);
  }
}

NavX = 4;
NavY = 4;
Navs = [];

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function clampToArea(v) {
  v.set(clamp(v.x, start.x+16, end.x-16), clamp(v.y, start.y+16, end.y-16));
}

function distArea(v) {
  return Math.min(Math.abs(v.x - start.x), Math.abs(v.x - end.x), Math.abs(v.y - start.y), Math.abs(v.y - end.y));
}

class Person {

  infectedDay = 0;


  constructor(state) {
    this.pos = createVector(random(start.x, end.x), random(start.y, end.y))
    this.state = state;
    this.speed = random(global("minSpeed"), global("maxSpeed"));
    this.vel = p5.Vector.fromAngle(random(0, TWO_PI));
    this.socialDist = random(0,1);

    this.nav = this.calcNav();
    this.navid = this.nav.add(this);
    this.target = this.getRandomCoord();
    
    this.size = global("size") + random(-global("randSize"),global("randSize"));
    this.infRad = global("infRad") + random(-global("randInfRad"),global("randInfRad"));
  }

  calcNav() {
    let x = Math.floor((this.pos.x - start.x) / area.x * NavX)
    let y = Math.floor((this.pos.y - start.y) / area.y * NavY)
    return Navs[x][y];
  }

  getRandomCoord() {
    let p = p5.Vector.fromAngle(random(0,TWO_PI),global("moveDist")).add(this.pos);
    clampToArea(p);
    return p;
  }

  tick() {
    if (this.state == 3) return;
    // if (distArea(this.pos) < global("infRad")) {
    //   // this.vel.rotate(random(-1,1));
      // this.vel = (p5.Vector.sub(center, this.pos)).normalize();
    // }
    // else {
    //   this.vel.rotate(random(-0.1, 0.1));
    // }

    this.vel = p5.Vector.sub(this.target,this.pos).normalize();
    // this.vel.rotate(random(-0.1, 0.1));
    // console.log(this.target + " " + this.pos);

    let socialSum = createVector(0,0);
    if (this.socialDist < global("socialChance")) {
      this.nav.people.forEach(v => {
        if (v != null && this.pos.dist(v.pos) < global("socialRad")) {
          socialSum.add(p5.Vector.sub(this.pos,v.pos).normalize());
        }
      });      
    }
    socialSum.setMag(global("socialForce"));
    this.vel.add(socialSum);
    this.vel.normalize();

    

    this.pos.add(p5.Vector.mult(this.vel, this.speed * (deltaTime / 1000) * global("speed")));
    clampToArea(this.pos);

    if (this.pos.dist(this.target) < this.size) {
      
      let ct = null;
      if (random(0,1) < global("centerChance")) {
        let t = [];
        centers.forEach(v => {
          if (v.pos.dist(this.pos) < global("centerAttr")) {
            t.push(v);
          }
        });
        if (t.length > 0) {
          ct = t[Math.floor(random(0,t.length))];
          this.target = ct.pos;
        }
      }

      if (ct == null) {
        this.target = this.getRandomCoord();        
      }
    }

    let curNav = this.calcNav();
    if (curNav != this.nav) {
      this.nav.remove(this.navid);
      this.nav = curNav;
      this.navid = curNav.add(this);
    }

    if (this.state == 1) {
      this.nav.people.forEach(v => {
        if (v != null && v.state == 0 && this.pos.dist(v.pos) < this.infRad + v.size) {
          let r = random(0, 1);
          if (r < global("infChance") * deltaTime * 0.01 * global("speed")) {
            v.state = 1;
          }
        }
      });
    }
  }

  secTick() {
    if (this.state == 1) {
      this.infectedDay++;

      if (this.infectedDay > global("recovDelay")) {
        if (random(0, 1) < global("recovChance")) {
          this.state = 2;
        } else if (this.infectedDay > global("deathDelay")) {
          if (random(0, 1) < global("deathChance")) {
            this.state = 3;
          }
        }
      } 
    }
  }

  draw() {
    let r = this.size;
    let c = Colors[this.state];
    fill(c);
    stroke(0, 0, 0);
    strokeWeight(1);
    ellipse(this.pos.x, this.pos.y, r*2, r*2);

    r = this.infRad;
    let c2 = color(red(c), green(c), blue(c));
    c2.setAlpha(100);
    noFill();
    stroke(c2);
    strokeWeight(1);
    ellipse(this.pos.x, this.pos.y, r*2, r*2);
  }
}

class Center {
  constructor() {
    this.pos = createVector(random(start.x+16,end.x-16),random(start.y+16,end.y-16))
  }

  draw() {
    noFill();
    stroke(color(255,255,0));
    strokeWeight(4);
    ellipse(this.pos.x, this.pos.y, 32, 32);
  }
}

function setup() {

  Colors = [color(50, 150, 50), color(150, 50, 50), color(0, 150, 200), color(0, 0, 0)];

  sideBar = createDiv();
  sideBar.position(16,16);
  sideBar.size(BarWidth-24,windowHeight-16);
  sideBar.style("overflow-y","auto");

  setupSlider(0.1, 10, 1, 0.1, "Simulation speed", "speed",1,"x",true);
  setupSlider(1, 64, 4, 1, "Size", "size",1,"px");
  setupSlider(1, 16, 1, 1, "Randomized size", "randSize",1,"px");
  setupSlider(1, 128, 16, 1, "Infection radius", "infRad",1,"px");
  setupSlider(1, 16, 4, 1, "Randomized inf. radius", "randInfRad",1,"px");
  setupSlider(0, 1, 0.2, 0.01, "Infection chance", "infChance",100,"%",true);
  setupSlider(0, 20, 10, 1, "Recovery delay", "recovDelay",1,"s",true);
  setupSlider(0, 1, 0.025, 0.01, "Recovery chance", "recovChance",100,"%",true);
  setupSlider(0, 20, 15, 1, "Death delay", "deathDelay",1,"s",true);
  setupSlider(0, 1, 0.01, 0.01, "Death chance", "deathChance",100,"%",true);
  setupSlider(0, 500, 250, 1, "Move distance", "moveDist",1,"px",true);
  setupSlider(0, 100, 20, 1, "Min speed", "minSpeed",1,"px/s");
  setupSlider(0, 100, 60, 1, "Max speed", "maxSpeed",1,"px/s");
  setupSlider(0, 100, 5, 1, "Centers", "centers",1,"");
  setupSlider(0, 1, 0.1, 0.01, "Center visit chance", "centerChance",100,"%",true);
  setupSlider(0, 500, 250, 1, "Center attraction", "centerAttr",1,"px",true);
  setupSlider(0, 128, 0, 1, "Social distancing radius", "socialRad",1,"px",true);
  setupSlider(0, 1, 0, 0.01, "Social distancing chance", "socialChance",100,"%",true);
  setupSlider(0, 10, 0, 0.1, "Social distancing force", "socialForce",1,"x",true,1);
  
  resetButton = createButton("Reset");
  resetButton.position(128, 0);
  resetButton.size(96, 32);
  resetButton.mousePressed(reset);
  resetButton.parent(sideBar);
  populationInput = createInput("500", "number");
  populationInput.position(16, 16);
  populationInput.size(96, 32);

  reset();

}

function reset() {


  createCanvas(windowWidth - 16, windowHeight - 16);
  start = createVector(BarWidth, 8);
  end = createVector(width - 8, height - 256);
  center = p5.Vector.sub(end, start).mult(0.5);
  area = p5.Vector.sub(end, start);

  console.log(start);
  console.log(end);
  console.log(center);

  generateNavs();

  Population = populationInput.value();

  people = [];
  time = 0;
  secTimer = 0;

  for (let i = 0; i < Population; i++) {
    people[i] = new Person(0)
  }

  centers = [];

  for (let i = 0; i < global("centers"); i++) {
    centers.push(new Center());
  }

  people[0].state = 1;

  graph = [];
}

function generateNavs() {
  for (let j = 0; j < NavY; j++) {
    row = [];
    for (let i = 0; i < NavX; i++) {
      row[i] = new Nav();    
    }
    Navs[j] = row;
  }  
}

function draw() {

  time += deltaTime;
  secTimer += deltaTime;

  clear();
  fill(50, 50, 50);
  stroke(255, 255, 255, 255);
  strokeWeight(2);
  rect(start.x, start.y, area.x, area.y);

  centers.forEach(v => {
    v.draw();
  });

  for (let i = 0; i < people.length; i++) {
    people[i].tick();
    people[i].draw();
  }

  Sliders.forEach(slider => {
    slider.valueDiv.html((slider.slider.value() * slider.map).toFixed(slider.fixed) + " " + slider.unit);
    GlobalSettings[slider.global] = slider.slider.value();
  });

  if (secTimer > 1000 / global("speed")) {
    secTimer = 0;

    states = [0, 0, 0, 0];

    for (let i = 0; i < people.length; i++) {
      people[i].secTick();
      states[people[i].state]++;
    }

    graph.push(states);
  }

  graphOrder = [1,0,2,3];

  for (let i = 0; i < graph.length; i++) {
    noStroke();
    fill(150, 50, 50);
    states = graph[i];
    last = 0;

    for (let j = 0; j < graphOrder.length; j++) {
      size = (states[graphOrder[j]] / Population) * 248;
      fill(Colors[graphOrder[j]]);
      rect(start.x + i * 4, end.y + 256 - size - last, 4, size);
      last += size;
    }

  }


}