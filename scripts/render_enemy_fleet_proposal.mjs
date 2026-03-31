import fs from "node:fs";
import path from "node:path";

import { CELL_SIZE, HALF_CELL, QUALITY_BY_ID } from "../src/data.js";
import {
  attachLooseBlock,
  createBlueprintBlock,
  createShipFromBlueprint,
  ejectDisconnectedBlocks,
  getBlockCells,
  getBlockWorldPosition,
  getCockpit,
  getCockpitOpenSides,
  getHullLength,
  getOpenSockets,
  makeDefaultPlayerBlueprint,
  selectThrustersForInput,
  serializeShipToBlueprint
} from "../src/ship.js";

const svgOutputPath = path.resolve("output/enemy-fleet-proposal.svg");
const htmlOutputPath = path.resolve("output/enemy-fleet-proposal.html");
const jsonOutputPath = path.resolve("output/enemy-fleet-proposal.json");

const width = 2440;
const margin = 40;
const gutter = 20;
const cardWidth = 312;
const cardHeight = 386;
const headerHeight = 164;
const rowHeaderHeight = 54;
const rowGap = 28;
const columns = 7;
const rowHeight = rowHeaderHeight + cardHeight;
const rows = ["needle", "bulwark", "manta", "fortress"];
const height = headerHeight + rows.length * rowHeight + (rows.length - 1) * rowGap + margin;

const archetypeQualities = {
  needle: "red",
  bulwark: "orange",
  manta: "blue",
  fortress: "purple"
};

function cloneStep(step) {
  return {
    ...step,
    socket: { ...step.socket }
  };
}

function cloneSteps(steps) {
  return steps.map((step) => cloneStep(step));
}

function cloneBlockRef(ref) {
  return {
    ...ref
  };
}

function matchesSocket(left, right) {
  return left.x === right.x && left.y === right.y && left.side === right.side;
}

function buildVariant(baseSteps, extraSteps = [], replacements = []) {
  const steps = cloneSteps(baseSteps);

  for (const replacement of replacements) {
    const index = steps.findIndex((step) => matchesSocket(step.socket, replacement.socket));
    if (index === -1) {
      throw new Error(`Missing proposal socket ${JSON.stringify(replacement.socket)}`);
    }
    steps[index] = {
      ...steps[index],
      ...replacement.updates,
      socket: {
        ...steps[index].socket,
        ...(replacement.updates.socket ?? {})
      }
    };
  }

  return steps.concat(cloneSteps(extraSteps));
}

function makeProposalDesign({ id, archetypeId, label, tags = [], buildSteps, removeBlocks = [] }) {
  return {
    id,
    archetypeId,
    label,
    tags,
    buildSteps: cloneSteps(buildSteps),
    removeBlocks: removeBlocks.map((ref) => cloneBlockRef(ref))
  };
}

function buildBlueprintFromSteps(buildSteps, quality, removeBlocks = []) {
  const ship = createShipFromBlueprint(makeDefaultPlayerBlueprint(), {
    team: "proposal-blueprint",
    kind: "enemy-blueprint"
  });

  for (const step of buildSteps) {
    const socket = getOpenSockets(ship).find(
      (entry) =>
        entry.x === step.socket.x &&
        entry.y === step.socket.y &&
        entry.side === step.socket.side
    );

    if (!socket) {
      throw new Error(`Missing socket for proposal step ${step.type} at ${JSON.stringify(step.socket)}`);
    }

    const looseBlock = createBlueprintBlock({
      type: step.type,
      x: 0,
      y: 0,
      quality,
      orientation: step.orientation ?? "north",
      variant: step.variant ?? "single"
    });
    const placed = attachLooseBlock(ship, looseBlock, socket);

    if (!placed) {
      throw new Error(`Failed to place proposal step ${step.type} at ${JSON.stringify(step.socket)}`);
    }
  }

  if (removeBlocks.length > 0) {
    for (const ref of removeBlocks) {
      ship.blocks = ship.blocks.filter((block) => {
        if (block.type === "cockpit") {
          return true;
        }
        if (ref.type && block.type !== ref.type) {
          return true;
        }
        if (ref.variant && block.variant !== ref.variant) {
          return true;
        }
        if (typeof ref.x === "number" && block.x !== ref.x) {
          return true;
        }
        if (typeof ref.y === "number" && block.y !== ref.y) {
          return true;
        }
        return false;
      });
    }
    ejectDisconnectedBlocks(ship);
  }

  return serializeShipToBlueprint(ship);
}

const baseSteps = {
  needle: [
    { type: "hull", variant: "triple", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: -1, y: 3, side: "west" } },
    { type: "thruster", socket: { x: 1, y: 3, side: "east" } },
    { type: "thruster", socket: { x: 0, y: 4, side: "south" } }
  ],
  bulwark: [
    { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "shield", socket: { x: -3, y: 0, side: "west" } },
    { type: "shield", socket: { x: 3, y: 0, side: "east" } },
    { type: "thruster", socket: { x: -1, y: 1, side: "south" } },
    { type: "thruster", socket: { x: 1, y: 1, side: "south" } }
  ],
  manta: [
    { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -2, y: -1, side: "north" } },
    { type: "hull", variant: "single", socket: { x: 2, y: -1, side: "north" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "spread", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: -2, y: 1, side: "south" } },
    { type: "thruster", socket: { x: 2, y: 1, side: "south" } }
  ],
  fortress: [
    { type: "hull", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
    { type: "hull", variant: "double", socket: { x: -1, y: -1, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: -1, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -2, y: 1, side: "south" } },
    { type: "hull", variant: "single", socket: { x: -1, y: 1, side: "south" } },
    { type: "hull", variant: "single", socket: { x: 1, y: 1, side: "south" } },
    { type: "hull", variant: "single", socket: { x: 2, y: 1, side: "south" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 2, side: "south" } },
    { type: "hull", variant: "double", socket: { x: -1, y: 2, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 2, side: "east" } },
    { type: "blaster", variant: "single", socket: { x: -2, y: -2, side: "north" } },
    { type: "blaster", variant: "dual", socket: { x: 0, y: -2, side: "north" } },
    { type: "blaster", variant: "single", socket: { x: 2, y: -2, side: "north" } },
    { type: "shield", socket: { x: -3, y: 0, side: "west" } },
    { type: "shield", socket: { x: 3, y: 0, side: "east" } },
    { type: "thruster", socket: { x: -1, y: 3, side: "south" } },
    { type: "thruster", socket: { x: 0, y: 3, side: "south" } },
    { type: "thruster", socket: { x: 1, y: 3, side: "south" } }
  ]
};

const altSteps = {
  needleCompact: [
    { type: "hull", variant: "double", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: 0, y: 3, side: "south" } }
  ],
  needleLong: [
    { type: "hull", variant: "triple", socket: { x: 0, y: 1, side: "south" } },
    { type: "hull", variant: "triple", socket: { x: 0, y: 4, side: "south" } },
    { type: "blaster", variant: "dual", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: 0, y: 7, side: "south" } }
  ],
  bulwarkCompact: [
    { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "shield", socket: { x: -2, y: 0, side: "west" } },
    { type: "shield", socket: { x: 2, y: 0, side: "east" } },
    { type: "thruster", socket: { x: 0, y: 1, side: "south" } }
  ],
  bulwarkWall: [
    { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
    { type: "hull", variant: "double", socket: { x: -3, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 3, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "shield", socket: { x: -5, y: 0, side: "west" } },
    { type: "shield", socket: { x: 5, y: 0, side: "east" } },
    { type: "thruster", socket: { x: 0, y: 2, side: "south" } }
  ],
  mantaCompact: [
    { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
    { type: "blaster", variant: "spread", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: 0, y: 1, side: "south" } }
  ],
  mantaWide: buildVariant(baseSteps.manta, [
    { type: "hull", variant: "single", socket: { x: -3, y: 0, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 3, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -3, y: -1, side: "north" } },
    { type: "hull", variant: "single", socket: { x: 3, y: -1, side: "north" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 2, side: "south" } }
  ]),
  fortressOuter: buildVariant(baseSteps.fortress, [
    { type: "hull", variant: "single", socket: { x: -3, y: -1, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 3, y: -1, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -3, y: 1, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 3, y: 1, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -3, y: 2, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 3, y: 2, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -2, y: 3, side: "south" } },
    { type: "hull", variant: "single", socket: { x: 2, y: 3, side: "south" } },
    { type: "shield", socket: { x: -4, y: 1, side: "west" } },
    { type: "shield", socket: { x: 4, y: 1, side: "east" } }
  ])
};

const proposalDefs = [
  makeProposalDesign({
    id: "needle-dart",
    archetypeId: "needle",
    label: "Dart",
    tags: ["small", "mobile"],
    buildSteps: altSteps.needleCompact
  }),
  makeProposalDesign({
    id: "needle-sting",
    archetypeId: "needle",
    label: "Sting",
    tags: ["small", "mobile"],
    buildSteps: baseSteps.needle
  }),
  makeProposalDesign({
    id: "needle-razer",
    archetypeId: "needle",
    label: "Razer",
    tags: ["mobile", "gunline"],
    buildSteps: buildVariant(
      baseSteps.needle,
      [
        { type: "hull", variant: "single", socket: { x: -1, y: 1, side: "west" } },
        { type: "hull", variant: "single", socket: { x: 1, y: 1, side: "east" } },
        { type: "blaster", variant: "single", socket: { x: -1, y: 0, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: 0, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "spread" } }]
    )
  }),
  makeProposalDesign({
    id: "needle-fork",
    archetypeId: "needle",
    label: "Fork",
    tags: ["mobile", "forked"],
    buildSteps: buildVariant(
      baseSteps.needle,
      [
        { type: "hull", variant: "single", socket: { x: -1, y: 1, side: "west" } },
        { type: "hull", variant: "single", socket: { x: 1, y: 1, side: "east" } },
        { type: "blaster", variant: "single", socket: { x: -1, y: 0, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: 0, side: "north" } },
        { type: "shield", socket: { x: -1, y: 2, side: "west" } },
        { type: "shield", socket: { x: 1, y: 2, side: "east" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "dual" } }]
    )
  }),
  makeProposalDesign({
    id: "needle-lance",
    archetypeId: "needle",
    label: "Lance",
    tags: ["mobile", "long"],
    buildSteps: buildVariant(
      altSteps.needleLong,
      [
        { type: "hull", variant: "single", socket: { x: -1, y: 5, side: "west" } },
        { type: "hull", variant: "single", socket: { x: 1, y: 5, side: "east" } },
        { type: "thruster", socket: { x: -1, y: 6, side: "south" } },
        { type: "thruster", socket: { x: 1, y: 6, side: "south" } }
      ]
    )
  }),
  makeProposalDesign({
    id: "needle-javelin",
    archetypeId: "needle",
    label: "Javelin",
    tags: ["balanced", "long"],
    buildSteps: buildVariant(
      altSteps.needleLong,
      [
        { type: "hull", variant: "single", socket: { x: -1, y: 5, side: "west" } },
        { type: "hull", variant: "single", socket: { x: 1, y: 5, side: "east" } },
        { type: "shield", socket: { x: -2, y: 5, side: "west" } },
        { type: "shield", socket: { x: 2, y: 5, side: "east" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "spread" } }]
    )
  }),
  makeProposalDesign({
    id: "needle-pike",
    archetypeId: "needle",
    label: "Pike",
    tags: ["low-yaw", "artillery"],
    buildSteps: altSteps.needleLong
  }),

  makeProposalDesign({
    id: "bulwark-ward",
    archetypeId: "bulwark",
    label: "Ward",
    tags: ["small", "balanced"],
    buildSteps: [
      { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
      { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
      { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } },
      { type: "thruster", socket: { x: 0, y: 1, side: "south" } }
    ]
  }),
  makeProposalDesign({
    id: "bulwark-guard",
    archetypeId: "bulwark",
    label: "Guard",
    tags: ["small", "balanced"],
    buildSteps: altSteps.bulwarkCompact
  }),
  makeProposalDesign({
    id: "bulwark-trench",
    archetypeId: "bulwark",
    label: "Trench",
    tags: ["balanced", "gunline"],
    buildSteps: buildVariant(
      baseSteps.bulwark,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "spread" } }]
    )
  }),
  makeProposalDesign({
    id: "bulwark-shelter",
    archetypeId: "bulwark",
    label: "Shelter",
    tags: ["slow", "wall"],
    buildSteps: altSteps.bulwarkWall
  }),
  makeProposalDesign({
    id: "bulwark-redoubt",
    archetypeId: "bulwark",
    label: "Redoubt",
    tags: ["balanced", "midwall"],
    buildSteps: buildVariant(
      baseSteps.bulwark,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "dual" } }]
    )
  }),
  makeProposalDesign({
    id: "bulwark-rampart",
    archetypeId: "bulwark",
    label: "Rampart",
    tags: ["slow", "wide"],
    buildSteps: buildVariant(
      altSteps.bulwarkWall,
      [
        { type: "hull", variant: "single", socket: { x: -4, y: 1, side: "south" } },
        { type: "hull", variant: "single", socket: { x: 4, y: 1, side: "south" } },
        { type: "thruster", socket: { x: -4, y: 2, side: "south" } },
        { type: "thruster", socket: { x: 4, y: 2, side: "south" } },
        { type: "blaster", variant: "single", socket: { x: -2, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 2, y: -1, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "dual" } }]
    )
  }),
  makeProposalDesign({
    id: "bulwark-anchor",
    archetypeId: "bulwark",
    label: "Anchor",
    tags: ["slow", "low-yaw"],
    buildSteps: buildVariant(
      altSteps.bulwarkWall,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "dual" } }]
    )
  }),

  makeProposalDesign({
    id: "manta-skiff",
    archetypeId: "manta",
    label: "Skiff",
    tags: ["small", "mobile"],
    buildSteps: [
      { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
      { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
      { type: "blaster", variant: "spread", socket: { x: 0, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } },
      { type: "thruster", socket: { x: -1, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 1, y: 1, side: "south" } }
    ]
  }),
  makeProposalDesign({
    id: "manta-fan",
    archetypeId: "manta",
    label: "Fan",
    tags: ["small", "balanced"],
    buildSteps: [
      { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
      { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
      { type: "hull", variant: "single", socket: { x: -1, y: -1, side: "north" } },
      { type: "hull", variant: "single", socket: { x: 1, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: -1, y: -2, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: 1, y: -2, side: "north" } },
      { type: "thruster", socket: { x: 0, y: 1, side: "south" } }
    ]
  }),
  makeProposalDesign({
    id: "manta-glide",
    archetypeId: "manta",
    label: "Glide",
    tags: ["mobile", "starter"],
    buildSteps: baseSteps.manta
  }),
  makeProposalDesign({
    id: "manta-crescent",
    archetypeId: "manta",
    label: "Crescent",
    tags: ["mobile", "wide"],
    buildSteps: buildVariant(altSteps.mantaWide, [
      { type: "thruster", socket: { x: 0, y: 3, side: "south" } }
    ])
  }),
  makeProposalDesign({
    id: "manta-harrier",
    archetypeId: "manta",
    label: "Harrier",
    tags: ["mobile", "gunline"],
    buildSteps: buildVariant(
      altSteps.mantaWide,
      [
        { type: "blaster", variant: "single", socket: { x: -2, y: -2, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 2, y: -2, side: "north" } },
        { type: "thruster", socket: { x: 0, y: 3, side: "south" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "dual" } }]
    )
  }),
  makeProposalDesign({
    id: "manta-driftwing",
    archetypeId: "manta",
    label: "Driftwing",
    tags: ["balanced", "wide"],
    buildSteps: buildVariant(altSteps.mantaWide, [
      { type: "shield", socket: { x: -4, y: 0, side: "west" } },
      { type: "shield", socket: { x: 4, y: 0, side: "east" } }
    ])
  }),
  makeProposalDesign({
    id: "manta-net",
    archetypeId: "manta",
    label: "Net",
    tags: ["slow", "area denial"],
    buildSteps: buildVariant(
      altSteps.mantaWide,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: -3, y: -2, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 3, y: -2, side: "north" } },
        { type: "thruster", socket: { x: 0, y: 3, side: "south" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "spread" } }]
    ),
    removeBlocks: [
      { type: "thruster", x: -2, y: 1 },
      { type: "thruster", x: 2, y: 1 }
    ]
  }),

  makeProposalDesign({
    id: "fortress-bastion",
    archetypeId: "fortress",
    label: "Bastion",
    tags: ["balanced", "brick"],
    buildSteps: baseSteps.fortress
  }),
  makeProposalDesign({
    id: "fortress-keep",
    archetypeId: "fortress",
    label: "Keep",
    tags: ["balanced", "compact"],
    buildSteps: buildVariant(baseSteps.fortress, [], [
      { socket: { x: -3, y: 0, side: "west" }, updates: { type: "blaster", variant: "single" } },
      { socket: { x: 3, y: 0, side: "east" }, updates: { type: "blaster", variant: "single" } }
    ])
  }),
  makeProposalDesign({
    id: "fortress-gatehouse",
    archetypeId: "fortress",
    label: "Gatehouse",
    tags: ["slow", "hollow"],
    buildSteps: altSteps.fortressOuter,
    removeBlocks: [
      { type: "hull", x: -1, y: 1 },
      { type: "hull", x: 0, y: 1 },
      { type: "hull", x: 1, y: 1 },
      { type: "blaster", x: -2, y: -2 },
      { type: "blaster", x: 2, y: -2 },
      { type: "thruster", x: -1, y: 3 },
      { type: "thruster", x: 1, y: 3 }
    ]
  }),
  makeProposalDesign({
    id: "fortress-voidshell",
    archetypeId: "fortress",
    label: "Voidshell",
    tags: ["balanced", "ring"],
    buildSteps: altSteps.fortressOuter,
    removeBlocks: [
      { type: "hull", x: -1, y: 1 },
      { type: "hull", x: 0, y: 1 },
      { type: "hull", x: 1, y: 1 },
      { type: "hull", x: 0, y: 2 }
    ]
  }),
  makeProposalDesign({
    id: "fortress-arsenal",
    archetypeId: "fortress",
    label: "Arsenal",
    tags: ["balanced", "edge guns"],
    buildSteps: buildVariant(
      altSteps.fortressOuter,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -2, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -2, side: "north" } }
      ],
      [
        { socket: { x: 0, y: -2, side: "north" }, updates: { variant: "spread" } },
        { socket: { x: -3, y: 0, side: "west" }, updates: { type: "blaster", variant: "single" } },
        { socket: { x: 3, y: 0, side: "east" }, updates: { type: "blaster", variant: "single" } },
        { socket: { x: -4, y: 1, side: "west" }, updates: { type: "blaster", variant: "single" } },
        { socket: { x: 4, y: 1, side: "east" }, updates: { type: "blaster", variant: "single" } }
      ]
    )
  }),
  makeProposalDesign({
    id: "fortress-citadel",
    archetypeId: "fortress",
    label: "Citadel",
    tags: ["slow", "low-yaw"],
    buildSteps: buildVariant(
      altSteps.fortressOuter,
      [],
      [{ socket: { x: 0, y: -2, side: "north" }, updates: { variant: "spread" } }]
    ),
    removeBlocks: [
      { type: "thruster", x: -1, y: 3 },
      { type: "thruster", x: 1, y: 3 }
    ]
  }),
  makeProposalDesign({
    id: "fortress-ringwall",
    archetypeId: "fortress",
    label: "Ringwall",
    tags: ["balanced", "hollow"],
    buildSteps: altSteps.fortressOuter,
    removeBlocks: [
      { type: "hull", x: -1, y: 1 },
      { type: "hull", x: 0, y: 1 },
      { type: "hull", x: 1, y: 1 }
    ]
  })
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function colorWithAlpha(hex, alpha) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getBlockColor(block) {
  return QUALITY_BY_ID[block.quality]?.color ?? "#8a93a1";
}

function getRenderAngleDegrees(block) {
  if (block.type === "cockpit") {
    return 0;
  }
  if (block.type === "hull") {
    return getHullLength(block) > 1 && (block.orientation === "east" || block.orientation === "west") ? 90 : 0;
  }
  return {
    north: 0,
    east: 90,
    south: 180,
    west: 270
  }[block.orientation];
}

function renderHull(block, color) {
  const hullLength = getHullLength(block);
  const hullWidth = HALF_CELL * 1.44;
  const hullHeight = hullWidth + CELL_SIZE * (hullLength - 1);
  const insetX = hullWidth * 0.18;
  const insetY = Math.min(8, hullHeight * 0.16);
  const seams = [];
  if (hullLength > 1) {
    const centerOffset = (hullLength - 1) * CELL_SIZE * 0.5;
    for (let index = 1; index < hullLength; index += 1) {
      const seamY = -centerOffset + CELL_SIZE * (index - 0.5);
      seams.push(
        `<line x1="${(-hullWidth * 0.34).toFixed(2)}" y1="${seamY.toFixed(2)}" x2="${(hullWidth * 0.34).toFixed(2)}" y2="${seamY.toFixed(2)}" />`
      );
    }
  }

  return `
    <g class="block" stroke="${color}" fill="${colorWithAlpha(color, 0.04)}">
      <rect x="${(-hullWidth * 0.5).toFixed(2)}" y="${(-hullHeight * 0.5).toFixed(2)}" width="${hullWidth.toFixed(2)}" height="${hullHeight.toFixed(2)}" />
      <line x1="${(-hullWidth * 0.5 + insetX).toFixed(2)}" y1="${(-hullHeight * 0.5 + insetY).toFixed(2)}" x2="${(hullWidth * 0.5 - insetX).toFixed(2)}" y2="${(hullHeight * 0.5 - insetY).toFixed(2)}" />
      <line x1="${(-hullWidth * 0.5 + insetX).toFixed(2)}" y1="${(hullHeight * 0.5 - insetY).toFixed(2)}" x2="${(hullWidth * 0.5 - insetX).toFixed(2)}" y2="${(-hullHeight * 0.5 + insetY).toFixed(2)}" />
      ${seams.join("")}
    </g>
  `;
}

function renderCockpit(color) {
  return `
    <g class="block" stroke="${color}" fill="${colorWithAlpha(color, 0.04)}">
      <rect x="${(-HALF_CELL * 0.72).toFixed(2)}" y="${(-HALF_CELL * 0.72).toFixed(2)}" width="${(HALF_CELL * 1.44).toFixed(2)}" height="${(HALF_CELL * 1.44).toFixed(2)}" />
      <path d="M 0 -3 C 7 -12 14 -4 0 10 C -14 -4 -7 -12 0 -3" fill="none" />
    </g>
  `;
}

function renderBlaster(block, color) {
  const barrelLines =
    block.variant === "dual"
      ? `<line x1="-6" y1="-14" x2="-6" y2="-22" /><line x1="6" y1="-14" x2="6" y2="-22" />`
      : `<line x1="0" y1="-14" x2="0" y2="-22" />`;
  const spreadLines =
    block.variant === "spread"
      ? `<line x1="0" y1="-14" x2="-7" y2="-22" /><line x1="0" y1="-14" x2="7" y2="-22" />`
      : "";
  return `
    <g class="block" stroke="${color}" fill="none">
      <path d="M -10 12 L -9 -6 L -4 -14 L 4 -14 L 9 -6 L 10 12 Z" />
      ${barrelLines}
      ${spreadLines}
    </g>
  `;
}

function renderThruster(color) {
  return `
    <g class="block" stroke="${color}" fill="none">
      <path d="M -11 -12 L 11 -12 L 7 10 L -7 10 Z" />
    </g>
  `;
}

function renderShield(color) {
  return `
    <g class="block" stroke="${color}" fill="none">
      <path d="M -12 18 Q 0 -12 12 18" />
      <line x1="-10" y1="7" x2="10" y2="7" />
    </g>
  `;
}

function renderBlock(block) {
  const color = getBlockColor(block);
  if (block.type === "cockpit") {
    return renderCockpit(color);
  }
  if (block.type === "hull") {
    return renderHull(block, color);
  }
  if (block.type === "blaster") {
    return renderBlaster(block, color);
  }
  if (block.type === "thruster") {
    return renderThruster(color);
  }
  return renderShield(color);
}

function renderCockpitDetails(ship, scale) {
  const cockpit = getCockpit(ship);
  if (!cockpit) {
    return "";
  }
  const cockpitWorld = getBlockWorldPosition(ship, cockpit);
  const cockpitOpenSides = getCockpitOpenSides(ship);
  const color = getBlockColor(cockpit);
  const details = [];

  if (cockpitOpenSides.west) {
    details.push(`<path d="M ${(-HALF_CELL * 0.72).toFixed(2)} -7 L ${(-HALF_CELL * 1.04).toFixed(2)} -4 L ${(-HALF_CELL * 1.04).toFixed(2)} 4 L ${(-HALF_CELL * 0.72).toFixed(2)} 7" />`);
  }
  if (cockpitOpenSides.east) {
    details.push(`<path d="M ${(HALF_CELL * 0.72).toFixed(2)} -7 L ${(HALF_CELL * 1.04).toFixed(2)} -4 L ${(HALF_CELL * 1.04).toFixed(2)} 4 L ${(HALF_CELL * 0.72).toFixed(2)} 7" />`);
  }
  if (cockpitOpenSides.south) {
    details.push(`<path d="M -7 ${(HALF_CELL * 0.72).toFixed(2)} L -4 ${(HALF_CELL * 1.04).toFixed(2)} L 4 ${(HALF_CELL * 1.04).toFixed(2)} L 7 ${(HALF_CELL * 0.72).toFixed(2)}" />`);
  }

  return `
    <g transform="translate(${cockpitWorld.x.toFixed(2)} ${cockpitWorld.y.toFixed(2)}) scale(${scale.toFixed(3)})" stroke="${color}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${details.join("")}
    </g>
  `;
}

function getShipFootprint(ship) {
  const cells = ship.blocks.flatMap((block) => getBlockCells(block));
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    occupied: new Set(cells.map((cell) => `${cell.x},${cell.y}`)).size
  };
}

function formatCompactNumber(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return String(Math.round(value));
}

function getMobilityStats(ship) {
  const forward = selectThrustersForInput(ship, {
    up: true,
    down: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: false
  });
  const turnLeft = selectThrustersForInput(ship, {
    up: false,
    down: false,
    left: false,
    right: false,
    turnLeft: true,
    turnRight: false
  });
  const turnRight = selectThrustersForInput(ship, {
    up: false,
    down: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: true
  });

  return {
    forwardThrust: Math.hypot(forward.localForceX, forward.localForceY),
    turnTorque: Math.max(Math.abs(turnLeft.torque), Math.abs(turnRight.torque))
  };
}

function renderShip(definition, centerX, centerY) {
  const quality = archetypeQualities[definition.archetypeId] ?? "blue";
  const blueprint = buildBlueprintFromSteps(definition.buildSteps, quality, definition.removeBlocks ?? []);
  const ship = createShipFromBlueprint(blueprint, {
    team: `proposal-${definition.id}`,
    kind: "enemy",
    x: 0,
    y: 0,
    angle: 0
  });
  const blasterCount = ship.blocks.filter((block) => block.type === "blaster").length;
  const thrusterCount = ship.blocks.filter((block) => block.type === "thruster").length;
  const footprint = getShipFootprint(ship);
  const mobility = getMobilityStats(ship);
  const rawWidth = footprint.width * CELL_SIZE;
  const rawHeight = footprint.height * CELL_SIZE;
  const scale = Math.min(1.05, 0.9 * Math.min(190 / rawWidth, 176 / rawHeight));
  const accent = QUALITY_BY_ID[quality].color;
  const blocks = ship.blocks
    .map((block) => {
      const world = getBlockWorldPosition(ship, block);
      return `
        <g transform="translate(${world.x.toFixed(2)} ${world.y.toFixed(2)}) rotate(${getRenderAngleDegrees(block)})">
          ${renderBlock(block)}
        </g>
      `;
    })
    .join("");

  return `
    <g transform="translate(${centerX} ${centerY})">
      <g transform="scale(${scale.toFixed(3)})">
        ${blocks}
      </g>
      ${renderCockpitDetails(ship, scale)}
      <text class="card-archetype" x="0" y="-132" fill="${accent}" text-anchor="middle">${escapeXml(definition.archetypeId.toUpperCase())}</text>
      <text class="card-tags" x="0" y="132" text-anchor="middle">${escapeXml(definition.tags.join(" • "))}</text>
      <text class="card-blasters" x="0" y="156" text-anchor="middle">B ${blasterCount}  •  T ${thrusterCount}</text>
      <text class="card-meta" x="0" y="178" text-anchor="middle">${footprint.width}x${footprint.height} FOOTPRINT  •  ${footprint.occupied} CELLS</text>
      <text class="card-meta" x="0" y="198" text-anchor="middle">F ${formatCompactNumber(mobility.forwardThrust)}  •  Y ${formatCompactNumber(mobility.turnTorque)}</text>
    </g>
  `;
}

function renderRow(archetypeId, rowIndex) {
  const rowTop = headerHeight + rowIndex * (rowHeight + rowGap);
  const quality = archetypeQualities[archetypeId];
  const accent = QUALITY_BY_ID[quality].color;
  const designs = proposalDefs.filter((definition) => definition.archetypeId === archetypeId);
  const title = `${archetypeId[0].toUpperCase()}${archetypeId.slice(1)}  •  ${designs.length} designs`;
  const cards = designs
    .map((definition, column) => {
      const left = margin + column * (cardWidth + gutter);
      const top = rowHeaderHeight;

      return `
        <g transform="translate(${left} ${top})">
          <rect class="card" x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="22" />
          <rect x="16" y="16" width="${cardWidth - 32}" height="42" rx="12" fill="${colorWithAlpha(accent, 0.16)}" />
          <text class="card-title" x="24" y="43">${escapeXml(definition.label)}</text>
          <text class="card-id" x="24" y="${cardHeight - 22}">${escapeXml(definition.id)}</text>
          ${renderShip(definition, cardWidth * 0.5, 182)}
        </g>
      `;
    })
    .join("");

  return `
    <g transform="translate(0 ${rowTop})">
      <text class="row-title" x="${margin}" y="34" fill="${accent}">${escapeXml(title)}</text>
      <text class="row-subtitle" x="${margin}" y="52">Symmetry-first proposal board, still constrained to the current cockpit, hull, blaster, thruster, and shield part set</text>
      ${cards}
    </g>
  `;
}

const rowSvgs = rows.map((archetypeId, rowIndex) => renderRow(archetypeId, rowIndex)).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#07101d" />
      <stop offset="100%" stop-color="#01040a" />
    </linearGradient>
    <pattern id="grid" width="120" height="120" patternUnits="userSpaceOnUse">
      <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(110, 247, 255, 0.05)" stroke-width="1" />
    </pattern>
    <style>
      text {
        font-family: "SF Mono", "Azeret Mono", "IBM Plex Mono", monospace;
        letter-spacing: 0.02em;
      }
      .title {
        fill: #f3fbff;
        font-size: 44px;
        font-weight: 700;
      }
      .subtitle {
        fill: rgba(179, 214, 255, 0.88);
        font-size: 22px;
        font-weight: 500;
      }
      .row-title {
        font-size: 22px;
        font-weight: 700;
      }
      .row-subtitle {
        fill: rgba(179, 214, 255, 0.62);
        font-size: 13px;
        font-weight: 500;
      }
      .card {
        fill: rgba(4, 12, 24, 0.88);
        stroke: rgba(110, 247, 255, 0.25);
        stroke-width: 2;
      }
      .card-title {
        fill: #f3fbff;
        font-size: 20px;
        font-weight: 700;
      }
      .card-id {
        fill: rgba(179, 214, 255, 0.72);
        font-size: 13px;
        font-weight: 500;
      }
      .card-archetype {
        font-size: 15px;
        font-weight: 600;
      }
      .card-tags {
        fill: rgba(244, 248, 255, 0.82);
        font-size: 12px;
        font-weight: 600;
      }
      .card-blasters {
        fill: rgba(179, 214, 255, 0.92);
        font-size: 15px;
        font-weight: 500;
      }
      .card-meta {
        fill: rgba(179, 214, 255, 0.68);
        font-size: 12px;
        font-weight: 500;
      }
      .block {
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect width="${width}" height="${height}" fill="url(#grid)" />
  <text class="title" x="${margin}" y="58">Neon Blaster X Proposed Enemy Fleet</text>
  <text class="subtitle" x="${margin}" y="96">28 legal proposal designs across Needle, Bulwark, Manta, and Fortress, with symmetry-first thruster placement and no Vulture archetype</text>
  <text class="subtitle" x="${margin}" y="128">Quotas across the full board: 3 low-yaw ships, 6 slow ships, and 9 highly mobile ships. This is a proposal render only.</text>
  ${rowSvgs}
</svg>
`;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Enemy Fleet Proposal</title>
    <style>
      html, body {
        margin: 0;
        background: #01040a;
      }
      img {
        display: block;
        width: ${width}px;
        height: auto;
      }
    </style>
  </head>
  <body>
    <img src="./enemy-fleet-proposal.svg" alt="Enemy fleet proposal" />
  </body>
</html>
`;

fs.writeFileSync(svgOutputPath, svg, "utf8");
fs.writeFileSync(htmlOutputPath, html, "utf8");
fs.writeFileSync(jsonOutputPath, JSON.stringify(proposalDefs, null, 2));

console.log(svgOutputPath);
console.log(htmlOutputPath);
console.log(jsonOutputPath);
