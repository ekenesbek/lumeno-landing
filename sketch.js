let osn;

// Total numbers to be collected
let goal = 500;

// Tracking the numbers
let refined = [];
let numbers = [];
let r, baseSize;
let buffer = 100;
let cols, rows;

// Info for refining
let refining = false;
let refineTX, refinteTY, refineBX, refineBY;

let lumeno;

let startTime = 0;
let secondsSpentRefining = 0;
let lastRefiningTimeStored = 0;

const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

// Info for "nope" state
let nope = false;
let nopeImg;
let nopeTime = 0;

// Info for "MDE" state
let mdeGIF = [];
let mde = false;
let mdeDone = false;
let mdeTime = 0;

// Info for 100% state
let completed = false;
let completedImg;
let completedTime = 0;

// Info for sharing
let shared = false;
let sharedImg;
let sharedTime = 0;

let shareDiv;

// for CRT Shader
let shaderLayer, crtShader;
let g; //p5 graphics instance
let useShader;

// Background and Foreground colours
const mobilePalette = {
  BG: '#010A13',
  FG: '#ABFFE9',
  SELECT: '#EEFFFF',
  LEVELS: {
    'WO': '#05C3A8',
    'FC': '#1EEFFF',
    'DR': '#DF81D5',
    'MA': '#F9ECBB',
  }
};

const shaderPalette = {
  BG: '#111111',
  FG: '#99f',
  SELECT: '#fff',
  LEVELS: {
    'WO': '#17AC97',
    'FC': '#4ABCC5',
    'DR': '#B962B0',
    'MA': '#D4BB5E',
  }
};

let palette = mobilePalette;

const lumenoAsciiLogo = [
  "██╗      ██╗   ██╗ ███╗   ███╗ ███████╗ ███╗   ██╗  ██████╗",
  "██║      ██║   ██║ ████╗ ████║ ██╔════╝ ████╗  ██║ ██╔═══██╗",
  "██║      ██║   ██║ ██╔████╔██║ █████╗   ██╔██╗ ██║ ██║   ██║", 
  "██║      ██║   ██║ ██║╚██╔╝██║ ██╔══╝   ██║╚██╗██║ ██║   ██║",
  "███████╗ ╚██████╔╝ ██║ ╚═╝ ██║ ███████╗ ██║ ╚████║ ╚██████╔╝",
  "╚══════╝  ╚═════╝  ╚═╝     ╚═╝ ╚══════╝ ╚═╝  ╚═══╝  ╚═════╝ ",
  "",
  "██╗ ███╗   ██╗ ██████╗  ██╗   ██╗ ███████╗ ████████╗ ██████╗  ██╗ ███████╗ ███████╗",
  "██║ ████╗  ██║ ██╔══██╗ ██║   ██║ ██╔════╝ ╚══██╔══╝ ██╔══██╗ ██║ ██╔════╝ ██╔════╝",
  "██║ ██╔██╗ ██║ ██║  ██║ ██║   ██║ ███████╗    ██║    ██████╔╝ ██║ █████╗   ███████╗",
  "██║ ██║╚██╗██║ ██║  ██║ ██║   ██║ ╚════██║    ██║    ██╔══██╗ ██║ ██╔══╝   ╚════██║",
  "██║ ██║ ╚████║ ██████╔╝ ╚██████╔╝ ███████║    ██║    ██║  ██║ ██║ ███████╗ ███████║",
  "╚═╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═════╝  ╚══════╝    ╚═╝    ╚═╝  ╚═╝ ╚═╝ ╚══════╝ ╚══════╝"
];

// holds filename, initial bin levels, coordinates
let macrodataFile;

function preload() {
  lumeno = loadImage('images/lumeno.png');
  nopeImg = loadImage('images/nope.png');
  completedImg = loadImage('images/100.png');
  sharedImg = loadImage('images/clipboard.png');
  // mdeGIF[0] = loadImage('images/mde.gif');

  crtShader = loadShader('shaders/crt.vert.glsl', 'shaders/crt.frag.glsl');
}

function startOver(resetFile = false) {
  // Track the amount of time
  startTime = millis();

  // Create the space
  r = (smaller - buffer * 2) / 10;
  baseSize = r * 0.33;
  osn = new OpenSimplexNoise();
  cols = floor(g.width / r);
  rows = floor((g.height - buffer * 2 - 80) / r); // Reserve space for bottom navigation

  let wBuffer = g.width - cols * r;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let x = i * r + r * 0.5 + wBuffer * 0.5;
      let y = j * r + r * 0.5 + buffer;
      // Initialize the number objects
      numbers[i + j * cols] = new Data(x, y);
    }
  }

  if (resetFile) {
    macrodataFile.resetFile();
    storeItem('secondsSpentRefining', 0);
    secondsSpentRefining = 0;
    lastRefiningTimeStored = 0;
  }

  // Refinement bins
  for (let i = 0; i < 5; i++) {
    const w = g.width / 5;
    const binLevels = macrodataFile.storedBins
      ? macrodataFile.storedBins[i]
      : undefined;
    refined[i] = new Bin(w, i, goal / 5, binLevels);
  }

  mde = false;
  mdeDone = false;
  mdeTime = 0;
  nopeTime = 0;
  nope = false;
  completed = false;
  shared = false;
  shareDiv.hide();
}

let zoff = 0;
let smaller;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);

  // create a downscaled graphics buffer to draw to, we'll upscale after applying crt shader
  g = createGraphics(windowWidth, windowHeight);

  // We don't want to use shader on mobile
  useShader = !isTouchScreenDevice();

  // The shader boosts colour values so we reset the palette if using shader
  if (useShader) {
    palette = shaderPalette;
  }

  // force pixel density to 1 to improve perf on retina screens
  pixelDensity(1);

  // p5 graphics element to draw our shader output to
  shaderLayer = createGraphics(g.width, g.height, WEBGL);
  shaderLayer.noStroke();
  crtShader.setUniform('u_resolution', [g.width, g.height]);

  smaller = min(g.width, g.height);

  macrodataFile = new MacrodataFile();
  secondsSpentRefining = getItem('secondsSpentRefining') ?? 0;

  sharedImg.resize(smaller * 0.5, 0);
  nopeImg.resize(smaller * 0.5, 0);
  completedImg.resize(smaller * 0.5, 0);

  // Width for the share 100% button
  const shw = completedImg.width;
  const shh = completedImg.height;
  shareDiv = createDiv('');
  shareDiv.hide();
  shareDiv.position(g.width * 0.5 - shw * 0.5, g.height * 0.5 - shh * 0.5);
  shareDiv.style('width', `${shw}px`);
  shareDiv.style('height', `${shh}px`);
  shareDiv.mousePressed(function () {
    let thenumbers = '';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        thenumbers += random(emojis);
      }
      thenumbers += '\n';
    }
    const timeStr = createTimeString(secondsSpentRefining);
    const msg = `In refining ${macrodataFile.coordinates} (${macrodataFile.fileName}) in ${timeStr} I have brought glory to the company.
Praise Kier.
${thenumbers}#mdrlumon #severance 🧇🐐🔢💯
lumon-industries.com`;

    console.log('navigator share not available, copy to clipboard!');
    navigator.clipboard.writeText(msg);
    shared = true;
  });

  startOver();
}
function mousePressed() {
  // Check if click is in the bottom navigation area (avoid interference)
  if (mouseY > windowHeight - 80) {
    return; // Don't start refining if clicking in bottom nav area
  }
  
  if (isInLogoArea(mouseX, mouseY)) {
    return;
  }
  
  if (!refining && !mde && !completed && !shared) {
    refineTX = mouseX;
    refineTY = mouseY;
    refineBX = mouseX;
    refineBY = mouseY;
    refining = true;
    nope = false;
  }
}

function mouseDragged() {
  // Don't drag if in bottom nav area
  if (mouseY > windowHeight - 80) {
    return;
  }
  refineBX = mouseX;
  refineBY = mouseY;
}

function mouseReleased() {
  // Don't process if in bottom nav area
  if (mouseY > windowHeight - 80) {
    return;
  }
  
  refining = false;
  let countRed = 0;
  let total = 0;
  let refinery = [];
  for (let num of numbers) {
    if (isInLogoArea(num.homeX, num.homeY)) {
      continue;
    }
    
    if (num.inside(refineTX, refineTY, refineBX, refineBY)) {
      if (num.refined) {
        refinery.push(num);
        countRed++;
      }
      total++;
    }
    num.turn(palette.FG);
    num.refined = false;
  }
  // half of numbers must be refinable
  if (countRed > 0.5 * total) {
    const options = [];
    for (let bin of refined) {
      if (bin.count < bin.goal) {
        options.push(bin);
      }
    }
    const bin = random(options);
    for (let num of refinery) {
      num.refine(bin);
    }
  } else {
    refinery = [];
    // 2nd worst if statement in the history of time
    if (!completed && !shared) {
      nope = true;
    }
    nopeTime = millis();
  }
}

let prevPercent;

function draw() {
  g.colorMode(RGB);
  let sum = 0;
  for (let bin of refined) {
    sum += bin.count;
  }
  let percent = sum / goal;

  if (percent !== prevPercent) {
    const bins = refined.map((bin) => bin.levels);
    macrodataFile.updateProgress(bins);
    prevPercent = percent;
  }

  if (percent >= 0.75 && !mde && !mdeDone) {
    mde = true;
    mdeTime = millis();
    if (frameCount == 1) {
      mdeDone = true;
      mde = false;
    }
  }

  if (millis() - mdeTime > 5 * 1000 && mde) {
    mdeDone = true;
    mde = false;
  }

  if (percent >= 1.0 && !completed && !shared) {
    completedTime = millis() - startTime;
    completed = true;
    shareDiv.show();
    console.log('completed!');
  }

  if (completed && shared) {
    completed = false;
    sharedTime = millis();
  }

  g.background(palette.BG);
  g.textFont('Courier');

  drawTop(percent);
  drawNumbers();
  drawBottom();

  drawBinned();

  drawLumenoAsciiLogo();

  g.imageMode(CORNER);
  if (!useShader) g.tint(mobilePalette.FG);
  g.image(lumeno, g.width - lumeno.width - 10, -5);
  if (nope) {
    g.imageMode(CENTER);
    if (!useShader) g.tint(mobilePalette.FG);
    g.image(nopeImg, g.width * 0.5, g.height * 0.5);
    if (millis() - nopeTime > 1000) {
      nope = false;
    }
  }

  if (completed) {
    g.imageMode(CENTER);
    if (!useShader) g.tint(mobilePalette.FG);
    g.image(completedImg, g.width * 0.5, g.height * 0.5);
  }

  if (shared) {
    g.imageMode(CENTER);
    if (!useShader) g.tint(mobilePalette.FG);
    g.image(sharedImg, g.width * 0.5, g.height * 0.5);
    if (millis() - sharedTime > 10000) {
      startOver(true);
    }
  }

  if (mde) {
    g.colorMode(HSB);
    let dim = 5;
    let yoff = 100;
    let inc = 0;
    let index = 0;
    for (let i = 0; i < dim; i++) {
      let xoff = 100;
      for (let j = 0; j < dim; j++) {
        const currGifFrame =
          (frameCount + (i + j)) % mdeGIF[0].gifProperties.numFrames;
        mdeGIF[0].setFrame(currGifFrame);
        let w = g.width / dim;
        let h = g.height / dim;
        g.noStroke();
        let hu = map(osn.noise3D(xoff, yoff, zoff * 2), -1, 1, -100, 500);
        g.fill(hu, 255, 255, 0.2);
        g.stroke(hu, 255, 255);
        g.strokeWeight(4);
        g.imageMode(CORNER);
        g.image(mdeGIF[0], i * w, j * h, w, h);
        index++;
        g.rectMode(CORNER);
        g.rect(i * w, j * h, w, h);
        xoff += 5;
      }
      yoff += 5;
    }
  }

  drawCursor(mouseX, mouseY);

  if (useShader) {
    shaderLayer.rect(0, 0, g.width, g.height);
    shaderLayer.shader(crtShader);

    // pass the image from canvas context in to shader as uniform
    crtShader.setUniform('u_tex', g);

    // Resetting the backgroudn to black to check we're not seeing the original drawing output
    background(palette.BG);
    imageMode(CORNER);
    image(shaderLayer, 0, 0, g.width, g.height);
  } else {
    image(g, 0, 0, g.width, g.height);
  }

  if (focused) {
    secondsSpentRefining += deltaTime / 1000;
    const roundedTime = round(secondsSpentRefining);
    if (roundedTime % 5 == 0 && roundedTime != lastRefiningTimeStored) {
      storeItem('secondsSpentRefining', secondsSpentRefining);
      lastRefiningTimeStored = roundedTime;
    }
  }
}

function drawLumenoAsciiLogo() {
  // Вычисляем размер области с цифрами
  const numbersAreaTop = buffer;
  const numbersAreaBottom = g.height - buffer;
  const numbersAreaHeight = numbersAreaBottom - numbersAreaTop;
  const numbersAreaWidth = g.width;
  
  // Центрируем логотип в области с цифрами, но поднимаем выше
  const centerX = numbersAreaWidth / 2;
  const centerY = numbersAreaTop + numbersAreaHeight / 2 - 50;
  
  // Настройки для ASCII текста
  g.textFont('Courier New', 'monospace');
  g.textAlign(CENTER, CENTER);
  
  // Определяем размер шрифта в зависимости от размера экрана (уменьшаем)
  let fontSize = map(smaller, 320, 1920, 7, 14);
  fontSize = constrain(fontSize, 6, 16);
  g.textSize(fontSize);
  
  // Полупрозрачный фон для лучшей читаемости (делаем ещё более прозрачным)
  const bgAlpha = 0.06;
  g.fill(red(palette.FG), green(palette.FG), blue(palette.FG), bgAlpha * 255);
  g.noStroke();
  
  // Вычисляем размеры блока текста
  const lineHeight = fontSize * 1.1;
  const totalHeight = lumenoAsciiLogo.length * lineHeight;
  const maxLineWidth = max(lumenoAsciiLogo.map(line => line.length));
  const totalWidth = maxLineWidth * fontSize * 0.55;
  
  // Рисуем полупрозрачный фон (делаем меньше)
  g.rectMode(CENTER);
  g.rect(centerX, centerY, totalWidth + 30, totalHeight + 30);
  
  // Рисуем ASCII логотип
  g.fill(palette.FG);
  g.stroke(palette.FG);
  g.strokeWeight(0.3);
  
  const startY = centerY - totalHeight / 2 + lineHeight / 2;
  
  for (let i = 0; i < lumenoAsciiLogo.length; i++) {
    const line = lumenoAsciiLogo[i];
    const y = startY + i * lineHeight;
    
    // Добавляем легкое свечение для каждой строки
    g.fill(palette.FG);
    g.text(line, centerX, y);
    
    // Дополнительный эффект свечения (опционально)
    if (useShader) {
      g.fill(red(palette.FG), green(palette.FG), blue(palette.FG), 30);
      g.text(line, centerX + 0.5, y + 0.5);
    }
  }
}

function drawTop(percent) {
  g.rectMode(CORNER);
  g.stroke(palette.FG);
  let w = g.width * 0.9;
  g.strokeWeight(2);
  let wx = (g.width - w) * 0.5;
  g.noFill();
  g.rect(wx, 25, w, 50);
  g.noStroke();
  g.fill(palette.FG);

  let realW = w - lumeno.width * 0.4;
  let pw = realW * percent;

  g.rect(wx + realW - pw, 25, pw, 50);
  g.noFill();
  g.fill(palette.BG);
  g.stroke(palette.FG);
  g.strokeWeight(4);
  g.textSize(32);
  g.textFont('Arial');
  g.text(`${floor(nf(percent * 100, 2, 0))}% Complete`, w * 0.8, 50);
  if (macrodataFile) {
    g.fill(palette.FG);
    g.stroke(palette.BG);
    g.text(macrodataFile.fileName, w * 0.175, 50);
  }
  g.fill(palette.BG);
  g.stroke(palette.FG);
}

function isInLogoArea(x, y) {
  const numbersAreaTop = buffer;
  const numbersAreaBottom = g.height - buffer;
  const numbersAreaHeight = numbersAreaBottom - numbersAreaTop;
  
  const centerX = g.width / 2;
  const centerY = numbersAreaTop + numbersAreaHeight / 2 - 50;
  
  let fontSize = map(smaller, 320, 1920, 7, 14);
  fontSize = constrain(fontSize, 6, 16);
  
  const lineHeight = fontSize * 1.1;
  const totalHeight = lumenoAsciiLogo.length * lineHeight;
  const maxLineWidth = max(lumenoAsciiLogo.map(line => line.length));
  const totalWidth = maxLineWidth * fontSize * 0.55;
  
  const extraHorizontalBuffer = 80; 
  const extraVerticalBuffer = 20;  
  
  const logoLeft = centerX - (totalWidth + 30 + extraHorizontalBuffer) / 2;
  const logoRight = centerX + (totalWidth + 30 + extraHorizontalBuffer) / 2;
  const logoTop = centerY - (totalHeight + 30 + extraVerticalBuffer) / 2;
  const logoBottom = centerY + (totalHeight + 30 + extraVerticalBuffer) / 2;
  
  return (x >= logoLeft && x <= logoRight && y >= logoTop && y <= logoBottom);
}

function drawNumbers() {
  g.rectMode(CENTER);
  g.noFill();
  g.strokeWeight(1);
  g.line(0, buffer, g.width, buffer);
  g.line(0, g.height - buffer - 80, g.width, g.height - buffer - 80); // Adjust for bottom nav

  let yoff = 0;

  const inc = 0.2;
  for (let i = 0; i < cols; i++) {
    let xoff = 0;
    for (let j = 0; j < rows; j++) {
      let num = numbers[i + j * cols];
      if (!num) return;
      
      if (isInLogoArea(num.homeX, num.homeY) && !num.binIt) {
        xoff += inc;
        continue;
      }
      
      if (num.binIt) {
        num.goBin();
        num.show();
        continue;
      }

      let n = osn.noise3D(xoff, yoff, zoff) - 0.4;
      if (n < 0) {
        n = 0;
        num.goHome();
      } else {
        num.x += random(-1, 1);
        num.y += random(-1, 1);
      }

      let sz = n * baseSize * 4 + baseSize;
      let d = dist(mouseX, mouseY, num.x, num.y);
      if (d < g.width * 0.1) {
        num.x += random(-1, 1);
        num.y += random(-1, 1);
      } else {
        num.goHome();
      }
      
      if (isInLogoArea(num.x, num.y) && !num.binIt) {
        num.goHome();
      }
      
      num.size(sz);
      num.show();
      xoff += inc;
    }
    yoff += inc;
  }
  zoff += 0.005;
}

function drawBottom() {
  for (let i = 0; i < refined.length; i++) {
    refined[i].show();
  }

  if (refining) {
    g.push();
    g.rectMode(CORNERS);
    g.stroke(palette.FG);
    g.noFill();
    g.rect(refineTX, refineTY, refineBX, refineBY);

    for (let num of numbers) {
      if (
        num.inside(refineTX, refineTY, refineBX, refineBY) &&
        num.sz > baseSize
      ) {
        num.turn(palette.SELECT);
        num.refined = true;
      } else {
        num.turn(palette.FG);
        num.refined = false;
      }
    }
    g.pop();
  }
  
  // Adjust bottom bar to not interfere with navigation
  g.rectMode(CORNER);
  g.fill(palette.FG);
  g.rect(0, g.height - 100, g.width, 20); // Moved up to avoid bottom nav
  g.fill(palette.BG);
  g.textFont('Courier');
  g.textAlign(CENTER, CENTER);
  g.textSize(baseSize * 0.8);
  g.text(macrodataFile.coordinates, g.width * 0.5, g.height - 90); // Moved up to avoid bottom nav
}

function drawBinned() {
  for (let num of numbers) {
    if (num.binIt) num.show();
  }
}

function drawFPS() {
  textSize(24);
  fill(palette.FG);
  noStroke();
  text(frameRate().toFixed(2), 50, 25);
}

function toggleShader() {
  if (useShader) {
    palette = mobilePalette;
  } else {
    palette = shaderPalette;
  }
  useShader = !useShader;
}

function drawCursor(xPos, yPos) {
  // prevents the cursor appearing in top left corner on page load
  if (xPos == 0 && yPos == 0) return;
  g.push()
  // this offset makes the box draw from point of cursor 
  g.translate(xPos+10, yPos+10);
  g.scale(1.2);
  g.fill(palette.BG);
  g.stroke(palette.FG);
  g.strokeWeight(3);
  g.beginShape();
  g.rotate(-PI/5);
  g.vertex(0, -10);
  g.vertex(7.5, 10);
  g.vertex(0, 5);
  g.vertex(-7.5, 10);
  g.endShape(CLOSE);
  g.pop();
}

function windowResized(ev) {
  resizeCanvas(windowWidth, windowHeight);
  g.resizeCanvas(windowWidth, windowHeight);
  shaderLayer.resizeCanvas(windowWidth, windowHeight)
  crtShader.setUniform('u_resolution', [g.width, g.height]);

  smaller = min(g.width, g.height);

  sharedImg.resize(smaller * 0.5, 0);
  nopeImg.resize(smaller * 0.5, 0);
  completedImg.resize(smaller * 0.5, 0);
  
  refined.forEach((bin) => bin.resize(g.width / refined.length));
  
  r = (smaller - buffer * 2) / 10;
  baseSize = r * 0.33;
   
  cols = floor(g.width / r);
  rows = floor((g.height - buffer * 2 - 80) / r); // Reserve space for bottom navigation
  let  wBuffer =  g.width - cols * r;
  
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let x = i * r + r * 0.5 + wBuffer * 0.5;
      let y = j * r + r * 0.5 + buffer;
      const numToUpdate = numbers[i + j * cols];
      if (numToUpdate) numToUpdate.resize(x, y);
    }
  }
}