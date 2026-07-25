import { DrawingPreset, DrawingStep } from '../types';

export const SAMPLE_DINOSAUR_STEPS: DrawingStep[] = [
  {
    step_number: 1,
    instruction: "Let's draw a big, friendly oval in the middle for our cute baby dinosaur's tummy!",
    svg_code: `<ellipse cx="250" cy="270" rx="90" ry="110" stroke="#10b981" stroke-width="8" stroke-linecap="round" fill="#d1fae5" />`
  },
  {
    step_number: 2,
    instruction: "Now add a nice round circle up top for his cheerful head, connected by a cozy neck!",
    svg_code: `<circle cx="210" cy="130" r="55" stroke="#10b981" stroke-width="8" stroke-linecap="round" fill="#d1fae5" />
<path d="M 180 170 Q 190 200 180 230" stroke="#10b981" stroke-width="8" stroke-linecap="round" fill="none" />`
  },
  {
    step_number: 3,
    instruction: "Give him a happy snout pointing right, and two big shiny eyes!",
    svg_code: `<path d="M 235 120 Q 285 130 250 160 Z" stroke="#10b981" stroke-width="8" stroke-linecap="round" fill="#d1fae5" />
<circle cx="195" cy="115" r="9" fill="#0f172a" />
<circle cx="225" cy="115" r="9" fill="#0f172a" />
<circle cx="192" cy="112" r="3" fill="#ffffff" />
<circle cx="222" cy="112" r="3" fill="#ffffff" />
<path d="M 230 145 Q 245 152 255 142" stroke="#059669" stroke-width="5" stroke-linecap="round" fill="none" />`
  },
  {
    step_number: 4,
    instruction: "Draw two sturdy short legs at the bottom so he can stomp around happily!",
    svg_code: `<path d="M 200 370 L 200 420 Q 200 435 220 435 L 225 435 L 225 380" stroke="#10b981" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="#a7f3d0" />
<path d="M 270 370 L 270 420 Q 270 435 290 435 L 295 435 L 295 380" stroke="#10b981" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="#a7f3d0" />`
  },
  {
    step_number: 5,
    instruction: "Add a swoop for a cute wagging dino tail on the left!",
    svg_code: `<path d="M 165 290 Q 90 320 80 250 Q 120 270 170 240" stroke="#10b981" stroke-width="8" stroke-linecap="round" fill="#a7f3d0" />`
  },
  {
    step_number: 6,
    instruction: "Finishing touch! Add playful triangle spikes along his neck and back!",
    svg_code: `<polygon points="175,130 155,120 170,110" fill="#f59e0b" stroke="#d97706" stroke-width="4" />
<polygon points="160,170 140,165 155,150" fill="#f59e0b" stroke="#d97706" stroke-width="4" />
<polygon points="155,210 135,210 150,190" fill="#f59e0b" stroke="#d97706" stroke-width="4" />
<polygon points="150,250 128,255 145,235" fill="#f59e0b" stroke="#d97706" stroke-width="4" />
<polygon points="120,270 98,265 110,250" fill="#f59e0b" stroke="#d97706" stroke-width="4" />`
  }
];

export const PRESETS: DrawingPreset[] = [
  {
    id: 'baby-dino',
    title: 'Cute Baby Dinosaur',
    category: 'Animals & Dinos',
    prompt: 'A cute baby T-Rex dinosaur standing happily with small arms and spikes',
    iconName: 'Footprints',
    description: 'Deconstruct a charming little dino with round belly and triangle back spikes!',
    sampleSteps: SAMPLE_DINOSAUR_STEPS
  },
  {
    id: 'pirate-ship',
    title: 'Flying Pirate Ship',
    category: 'Vehicles & Adventure',
    prompt: 'A floating wooden pirate ship with big puffy sails and wing propellers',
    iconName: 'Ship',
    description: 'Learn to draw a curved ship hull, mast lines, and puffy sail rectangles.'
  },
  {
    id: 'friendly-robot',
    title: 'Friendly Robot',
    category: 'Sci-Fi & Characters',
    prompt: 'A square-headed cheerful robot with antenna, glowing button chest, and treads',
    iconName: 'Bot',
    description: 'Deconstruct a robot into square boxes, circles, zig-zag wires, and wheels!'
  },
  {
    id: 'teddy-bear',
    title: 'Fluffy Teddy Bear',
    category: 'Cute & Toys',
    prompt: 'A cuddly teddy bear sitting down with round ears, soft tummy, and paw pads',
    iconName: 'Sparkles',
    description: 'Build a cute plush bear starting with overlapping big circles and ovals.'
  },
  {
    id: 'rocket-ship',
    title: 'Space Rocket',
    category: 'Vehicles & Adventure',
    prompt: 'A tall space rocket ship with round porthole window, side fins, and fiery blast-off flame',
    iconName: 'Rocket',
    description: 'Draw a cone top, cylinder body, triangular fins, and fiery wavy flames!'
  },
  {
    id: 'smiling-car',
    title: 'Smiling Race Car',
    category: 'Vehicles & Adventure',
    prompt: 'A sleek cartoon race car with big round wheels, headlight eyes, and a friendly bumper smile',
    iconName: 'Car',
    description: 'Start with a smooth curved dome body and two bold black tire circles.'
  },
  {
    id: 'magic-unicorn',
    title: 'Magic Unicorn',
    category: 'Cute & Toys',
    prompt: 'A sweet magic unicorn head with a spiral horn, star eyes, and flowing wavy mane',
    iconName: 'Wand2',
    description: 'Combine smooth curves for the snout, triangular horn, and flowing hair loops!'
  },
  {
    id: 'cool-owl',
    title: 'Wise Little Owl',
    category: 'Animals & Dinos',
    prompt: 'A cute round owl perched on a branch with giant eyes and feather wings',
    iconName: 'Feather',
    description: 'Draw a big egg shape, two giant concentric eye circles, and a tiny beak triangle!'
  }
];
