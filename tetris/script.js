//=======//
// WORLD //
//=======//
const World = struct ({
	cells: undefined,
	dimensions: [0, 0]
})

const makeWorld = (dimensions) => {
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
	const world = World({cells, dimensions})
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
	const {cells} = world
	const buffer = getClonedCells(cells)
	let isCollision = false

	let forwards = [0, 1]
	let backwards = [0, -1]

	if (world.instruction === "ArrowRight") {
		forwards = [1, 0]
		backwards = [-1, 0]
	} else if (world.instruction === "ArrowLeft") {
		forwards = [-1, 0]
		backwards = [1, 0]
	}

	for (const [key, cell] of cells.entries()) {
		if (!cell.active) continue
		const below = getRelativeCell(world, cell, forwards)
	
		if (below === cell || !below.active && below.colour !== Colour.Black) {
			isCollision = true
			cell.active = false
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
		for (const cell of cells.values()) {
			cell.active = false
		}
		spawnBlock(world)
	} else {
		world.cells = buffer
	}
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
const WORLD_WIDTH = 20
const WORLD_HEIGHT = 20

//============//
// GAME SETUP //
//============//
const world = makeWorld([WORLD_WIDTH, WORLD_HEIGHT])

//===========//
// GAME LOOP //
//===========//
const stage = Stage.start({aspectRatio: [WORLD_WIDTH, WORLD_HEIGHT]})

let t = 0
stage.tick = (context) => {
	t++
	if (Keyboard["ArrowRight"]) world.instruction = "ArrowRight"
	if (Keyboard["ArrowLeft"]) world.instruction = "ArrowLeft"
	if (!Keyboard["ArrowRight"] && !Keyboard["ArrowLeft"]) world.instruction = undefined
	if (t >= 10) {
		updateWorld(world)
		t = 0
	}
	drawWorld(context, world)
}