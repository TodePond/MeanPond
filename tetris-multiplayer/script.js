//=======//
// WORLD //
//=======//
const World = struct ({
	cells: undefined,
	dimensions: [0, 0],
	player: 0,
})

const makeWorld = (dimensions, player) => {
	const [width, height] = dimensions
	const cells = new Map()
	for (const x of (0).to(width-1)) {
		for (const y of (0).to(height-1)) {
			const position = [x, y]
			const cell = Cell({position})
			const key = getCellKey(cell)
			cells.set(key, cell)
		}
	}
	const world = World({cells, dimensions, player})
	spawnBlock(world)
	
	return world
}

const getRelativeCell = (world, cell, displacement) => {
	const [dx, dy] = displacement
	const [x, y] = cell.position
	const position = [x+dx, y+dy]
	let [rx, ry] = position
	const [worldWidth, worldHeight] = world.dimensions
	rx = Math.clamp(rx, 0, worldWidth-1)
	ry = Math.clamp(ry, 0, worldHeight-1)
	const relativeCell = getCell(world, [rx, ry])
	return relativeCell
}

const drawWorld = (context, world) => {
	const {canvas} = context
	const {width, height} = canvas
	context.clearRect(0, 0, width, height)
	const {cells} = world
	for (const cell of cells.values()) {
		drawCell(context, cell, world)
	}
}

const getWorldCellDimensions = (context, world) => {
	const {canvas} = context
	const [worldWidth, worldHeight] = world.dimensions
	const width = canvas.width / worldWidth
	const height = canvas.height / worldHeight
	return [width, height]
}

const getCell = (world, position) => {
	const key = getPositionKey(position)
	const {cells} = world
	const cell = cells.get(key)
	return cell
}

const getTopCell = (world) => {
	const [width] = world.dimensions
	const x = Math.floor(width / 2)
	const cell = getCell(world, [x, 0])
	return cell
}

const getClonedCells = (cells) => {
	const buffer = new Map()
	for (const [key, cell] of cells.entries()) {
		const clone = {...cell}
		buffer.set(key, clone)
	}
	return buffer
}

const updateWorld = (world) => {
	moveCells(world, [0, 1], [0, -1])
}

const moveCells = (world, forwards, backwards, {freeze = true} = {}) => {
	const {cells} = world
	const buffer = getClonedCells(cells)
	let isCollision = false

	for (const [key, cell] of cells.entries()) {
		if (!cell.active) continue
		const below = getRelativeCell(world, cell, forwards)
	
		if (below === cell || !below.active && below.colour !== Colour.Black) {
			isCollision = true
			if (freeze)	cell.active = false
			break
		}
		
		const bufferCell = buffer.get(key)
		const belowKey = getCellKey(below)
		const bufferBelow = buffer.get(belowKey)

		bufferBelow.colour = cell.colour
		bufferBelow.active = true

		const above = getRelativeCell(world, cell, backwards)
		if (above === cell || !above.active) {
			bufferCell.colour = Colour.Black
			bufferCell.active = false
		}

	}

	if (isCollision) {
		if (freeze) { 
			for (const cell of cells.values()) {
				cell.active = false
			}
			checkRowsClear(world)
			spawnBlock(world)
		}
	} else {
		world.cells = buffer
	}
}

const checkRowsClear = (world) => {
	const [width, height] = world.dimensions
	for (const y of (0).to(height-1)) {
		checkRowClear(world, y)
	}
}

const checkRowClear = (world, y) => {
	const [width] = world.dimensions
	for (const x of (0).to(width-1)) {
		const cell = getCell(world, [x, y])
		if (cell.colour === Colour.Black) return false
	}

	const {cells} = world
	const buffer = getClonedCells(cells)
	for (const [key, cell] of cells.entries()) {
		if (cell.position[1] > y) continue
		const above = getRelativeCell(world, cell, [0, -1])
		const abovekey = getCellKey(above)
		const bufferCell = buffer.get(key)
		if (cell !== above) {
			bufferCell.colour = above.colour
		} else {
			bufferCell.colour = Colour.Black
		}
	}

	world.cells = buffer
}

const spawnBlock = (world) => {
	const id = Random.Uint8 % SHAPES.length
	const cell = getTopCell(world)
	const colour = COLOURS[id]
	const shape = SHAPES[id]

	const relativeCells = shape.map(point => getRelativeCell(world, cell, point))
	for (const relativeCell of relativeCells) {
		relativeCell.colour = colour
		relativeCell.active = true
	}
}

const rotateCells = (world, cells) => {
	const buffer = getClonedCells(world.cells)
	const head = cells[1]
	const tail = cells.filter(cell => cell !== head)
	const origin = head.position
	let [ox, oy] = origin
	for (const cell of tail) {
		const [x, y] = cell.position
		const [dx, dy] = [x - ox, y - oy]
		const rotatedDisplacement = [-dy, dx]
		const [rdx, rdy] = rotatedDisplacement
		const rotatedPosition = [ox + rdx, oy + rdy]
		const targetedCell = getCell(world, rotatedPosition)
		const sourceCell = getCell(world, [ox + dy, oy - dx])
		if (targetedCell !== undefined && (targetedCell.active || targetedCell.colour === Colour.Black)) {
			const key = getCellKey(cell)
			const targetKey = getCellKey(targetedCell)
			const bufferCell = buffer.get(key)
			const bufferTarget = buffer.get(targetKey)

			if (!sourceCell.active) {
				bufferCell.colour = Colour.Black
				bufferCell.active = false
			}

			bufferTarget.colour = cell.colour
			bufferTarget.active = true
		} else {
			throw new Error("No space for rotation")
		}
	}
	
	world.cells = buffer
}

//======//
// CELL //
//======//
const Cell = struct ({
	position: [0, 0],
	colour: Colour.Black,
	active: false,
})

const getCellKey = (cell) => {
	const {position} = cell
	const key = getPositionKey(position)
	return key
}

const getPositionKey = (position) => {
	const [x, y] = position
	const key = [x, y].join()
	return key
}

const getCellCanvasPosition = (context, cell, world) => {
	const [width, height] = getWorldCellDimensions(context, world)
	const {position} = cell
	const [x, y] = position
	const canvasPosition = [x * width, y * height]
	return canvasPosition
}

const drawCell = (context, cell, world) => {
	
	const [width, height] = getWorldCellDimensions(context, world)
	const [x, y] = getCellCanvasPosition(context, cell, world)

	const {colour} = cell
	context.fillStyle = colour
	context.fillRect(x, y, width, height)
}

//=======//
// SHAPE //
//=======//
const SHAPES = []
SHAPES.push([
	[-1, 0], [ 0, 0], [ 1, 0],
])

SHAPES.push([
	[ 0, 0],
	[ 0, 1], [ 1, 1],
])

SHAPES.push([
	[ 0, 0],
	[-1, 1], [ 0, 1],
])

//========//
// COLOUR //
//========//
const COLOURS = [
	Colour.Green,
	Colour.Blue,
	Colour.Red,
]

//=============//
// GAME CONFIG //
//=============//
const WORLD_WIDTH = 10
const WORLD_HEIGHT = 20

//============//
// GAME SETUP //
//============//
const stages = [0, 1].map((v) => Stage.start({aspectRatio: [WORLD_WIDTH, WORLD_HEIGHT]}))
const worlds = [0, 1].map((v) => makeWorld([WORLD_WIDTH, WORLD_HEIGHT], v))

//===========//
// GAME LOOP //
//===========//

let t0 = 0
stages[0].tick = (context) => {
	t0++
	if (t0 >= 10) {
		updateWorld(worlds[0])
		t0 = 0
	}
	drawWorld(context, worlds[0])
}

let t1 = 0
stages[1].tick = (context) => {
	t1++
	if (t1 >= 10) {
		updateWorld(worlds[1])
		t1 = 0
	}
	drawWorld(context, worlds[1])
}

stages[0].resize = (context) => {
	context.canvas.style["left"] = "-440px"
}

stages[1].resize = (context) => {
	context.canvas.style["left"] = "440px"
}

on.keydown(e => {
	
	// Player 1
	if (e.key === "ArrowRight") {
		moveCells(worlds[1], [1, 0], [-1, 0], {freeze: false})
		return
	}

	if (e.key === "ArrowLeft") {
		moveCells(worlds[1], [-1, 0], [1, 0], {freeze: false})
		return
	}

	if (e.key === "ArrowUp" || e.key === "ArrowDown") {
		const cells = [...worlds[1].cells.values()].filter(cell => cell.active)
		rotateCells(worlds[1], cells)
	}
	
	// Player 2
	if (e.key === "d") {
		moveCells(worlds[0], [1, 0], [-1, 0], {freeze: false})
		return
	}

	if (e.key === "a") {
		moveCells(worlds[0], [-1, 0], [1, 0], {freeze: false})
		return
	}

	if (e.key === "w" || e.key === "s") {
		const cells = [...worlds[0].cells.values()].filter(cell => cell.active)
		rotateCells(worlds[0], cells)
	}


})