"use strict";

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { get_JSON_character_objects } from "./DataCleaning.js";

/** 
 * 1: root
 * 2: location
 * 3: groupings
 * 4: characters (leafs)
 e*/
const TREE_HEIGHT = 4;

let characters_array = [];
let colorRange;
let characters_tree;
let nodeInFocus;
let topLevelFocus;
let view;
let w_circlePack;
let h_circlePack;
let labelsGroup;
let circlesGroup;
let svg_circlePack;
let groupingSpecifier;
let statsSpecifier;
let title;
let barTitle;
let circlefiedNodes;

document.getElementById('btn_race').addEventListener('click', event => handleGroupingClick('race', event));
document.getElementById('btn_class').addEventListener('click', event => handleGroupingClick('class', event));
document.getElementById('btn_skill').addEventListener('click', event => handleGroupingClick('skill', event));
document.getElementById('btn_aggression').addEventListener('click', event => handleGroupingClick('aggression', event));
document.getElementById('btn_morality').addEventListener('click', event => handleGroupingClick('morality', event));

document.getElementById('btn_health').addEventListener('click', event => handleStatsClick('health', event));
document.getElementById('btn_magicka').addEventListener('click', event => handleStatsClick('magicka', event));
document.getElementById('btn_stamina').addEventListener('click', event => handleStatsClick('stamina', event));  

window.onload = async function()
{
	/* Get array of JSON objects. */
	characters_array = await get_JSON_character_objects();

	/* Set defaults. */
	groupingSpecifier = 'race';
	statsSpecifier = 'health';

	title = "Skyrim";
	document.getElementById('title').textContent = title;

	barTitle = `Population ${statsSpecifier.toUpperCase()}`;
	document.getElementById('barTitle').textContent = barTitle;

	/* Initial call. */
	drawCharts();
}

function drawCharts()
{
	/** 
	 * Color range is determined by statsDropdown.
	 * We will assign colorRang a list of color that D3's interpolation function
	 * will use to create a range of colors.
	 * */
	if (statsSpecifier == "health") { colorRange = ["maroon", "red"]; }
	else if (statsSpecifier == "magicka") { colorRange = ["navy", "lightblue"]; } 
	else { colorRange = ["green", "lightgreen"] }

	/* Re-create JSON tree based on current dropdown values. */
	characters_tree = get_tree();

	createCirclePack();
	createBarGraph();
}

function createCirclePack()
{
	/* Remove previous svg from circlePack, if any */
	d3.select("#circlePack").select("svg").remove();

	/* Get dimensions of circlePack div */
	w_circlePack = document.getElementById("circlePack").getBoundingClientRect().width;
	h_circlePack = document.getElementById("circlePack").getBoundingClientRect().height;

	/* Create the color scale/interpolation for circle pack based on height of tree */
	let color = d3.scaleLinear()
		.domain([0, TREE_HEIGHT])
		.range(colorRange)
		.interpolate(d3.interpolateHcl);

	/**
	 * Create a (d3) hierarchy object.
	 * Adds data/children properties + parent references to the JSON objects you pass in.
	 * Basically converts JSON objects to nodes and links them into a hierarchy based on their nesting.
	 */
	const hierarchy = d3.hierarchy(characters_tree);
	
	/* Loops through all nodes and assigns value property based on the sum of child nodes. */
	hierarchy.sum(d => d.value);

	/** 
	 * Re-orders nodes within a given level based on value. 
	 * In terms of the visuals, this will make it so D3 puts larger circles
	 * towards (glomming) the center of its parent circle. Looks much nicer.
	 */
	hierarchy.sort((a, b) => b.value - a.value);

	/**
	 * `pack` is a function.
	 * We will tell it what size it has to pack ALL the circles into,
	 * 	but we are really just giving it boundaries on the space it has to fit the outermost circle.
	 * `.padding()` sets how much padding should be used BETWEEN circles.
	 */
	const pack = d3.pack().size([w_circlePack, h_circlePack]).padding(3);

	/**
	 * Calculate the x, y, and r for each node (circle) based on 
	 * the hierarchical data and the size of the SVG container.
	 */
	const circlefiedHierarchy = pack(hierarchy);

	/* This is only ever set here. */
	topLevelFocus = circlefiedHierarchy;

	nodeInFocus = circlefiedHierarchy;
	
	/* Get the nodes (array) with their x, y, and r values; includes root node. */
	circlefiedNodes = circlefiedHierarchy.descendants();

	/** 
	 * This is basically like `.getElementById()`, but D3 wraps it as a 
	 * D3 object and allows us to use all sorts of nice D3 methods on it. 
	 */
	const circlePack = d3.select("#circlePack");

	/* This creates a child SVG element to the D3 object from above and returns a ref. */
	svg_circlePack = circlePack.append("svg");
	svg_circlePack.attr("viewBox", `-${w_circlePack / 2} -${h_circlePack / 2} ${w_circlePack} ${h_circlePack}`);
	
	/* Circle so just pick one for both. */
	svg_circlePack.attr("width", h_circlePack);
	svg_circlePack.attr("height", h_circlePack);
	svg_circlePack.attr("opacity", 0.9);

	/** 
	 * Create an SVG group element to define style/behavior for all circle elements. 
	 * 
	 * <circle cx="50" cy="50" r="50" /> is what SVG circle elements look like.
	 * 
	 * The circlefiedNode created by the `pack` function has x, y, and r properties.
	 * The d3.join() function uses these to create SVG circles for each node.
	 * 
	 * You have to read this backwards (order of exectuion) for it to make sense.
	 */
	circlesGroup = svg_circlePack.append("g")
		.selectAll("circle")
		.data(circlefiedNodes)
		.join("circle");
	
	/* Set color based on depth; leafs are white. */
	circlesGroup.attr("fill", d => d.children ? color(d.depth) : "white");
	
	/* Give every SVG circle element a unique id: `circle-<node name>`. */
    circlesGroup.attr("id", d => `circle-${correctId(d.data.name)}`);

	/* Glove world. */
	circlesGroup.style("cursor", "pointer");

	/* Highlight (with border) the circle and corresponding bar. */
	circlesGroup.on("mouseover", (event, d) =>
	{
		if (nodeInFocus.data.level !== 2 && d.data.isLeaf) {
			return;
		}

		d3.select(event.currentTarget).classed("highlighted", true);
		d3.select(`#bar-${correctId(d.data.name)}`).classed("highlighted", true);
		
		if (d.data.isLeaf && nodeInFocus.data.level == 2)
		{
			tooltip.style("display", "block")
				.style("left", `${event.pageX + 10}px`)
				.style("top", `${event.pageY + 10}px`)
				.text(`"${d.data.name}"  |  ${statsSpecifier.toUpperCase()}: ${d.value}`);
		}
	});
	
	/* Remove highlight. */
	circlesGroup.on("mouseout", (event, d) => {
		d3.select(event.currentTarget).classed("highlighted", false);
		d3.select(`#bar-${correctId(d.data.name)}`).classed("highlighted", false);
		tooltip.style("display", "none");
	});
	
	circlesGroup.on("click", (event, d) => {
		if (nodeInFocus !== d) {
			zoom(event, d);
			event.stopPropagation();
	}});

	/* Same thing as above, but for the text labels */
	labelsGroup = svg_circlePack.append("g")
		.selectAll("text")
		.data(circlefiedNodes)
		.join("text")
		/* We don't want label to react to anything. */
		.attr("pointer-events", "none")
		/* This is justification relative to the object. */
		.attr("text-anchor", "middle")
		/* Set labels for everything except the root node. */
		.style("fill-opacity", d => d.parent === hierarchy ? 1 : 0)
		.style("display", d => d.parent === hierarchy ? "inline" : "none")
		.style("font", d => {
			/* Make sure nothing less than 10, otherwise make font a function of circle size. */
            const fontSize = Math.max(10, d.r * 0.4);
            return `${fontSize}px sans-serif`;
        })
		.style("font-weight", "bold")
		.text(d => d.data.name);

	/* Tooltip stuff. */
	const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '2px')
        .style('border-radius', '5px')
        .style('padding', '5px');

	svg_circlePack.on("click", (event) => zoom(event, circlefiedHierarchy)); 

	zoomTo( [nodeInFocus.x, nodeInFocus.y, (nodeInFocus.r * 2)] );
}

function createBarGraph()
{
    /* Remove previous SVG (if any). */
    d3.select("#barGraph").select("svg").remove();

    let w = document.getElementById("barGraph").getBoundingClientRect().width;
    let h = document.getElementById("barGraph").getBoundingClientRect().height;

	/* Need more space on left margin for long labels */
    const margin = { top: 40, right: 10, bottom: 35, left: 110 };

    const data = nodeInFocus.data.children;

	/* Create/assign value per element to determine bar length. */
    data.forEach(d => d.value = assignValuesForBars(d));

	/**
	 * Sort elements like in circle pack.
	 * Visual effect: bars will be in descending order (top-bottom)
	 */
	data.sort((a, b) => b.value - a.value);

	/* Determine length of longest bar (i.e. max of dependent axis). */
    const domainMax = d3.max(data, d => d.value);

	/* Similar to circlepack. */
    const color = d3.scaleLinear()
        .domain([0, domainMax])
        .range(colorRange);

	/* Horizontal bar graph ==> x-axis (left/right) is DEPENDENT axis; y-axis (up/down) is INDEPENDENT axis */
    const x = 
		/* Give us a scale of CONTINUOUS values. */
		d3.scaleLinear()
		/* To accommodate length of bars (left/right). */
        .domain([0, domainMax])
		/* Rounds the domain ticks (intervals are between round numbers). */
        .nice()
		/* This defines the actual axis range (in terms of visuals). Reasonable to have it fit the input data. */
        .range([margin.left, w - margin.right]);

    const y = 
		/* Give us a scale of DISCRETE values. */
		d3.scaleBand()
		/* Since these are discrete, we have to map them manually. */
        .domain(data.map(d => d.name))
        .range([margin.top, h - margin.bottom])
		/* Distance between bars. */
        .padding(0.1);

	/* Create and get reference to the SVG element for our bar graph. */
    const svg = d3.select("#barGraph")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("viewBox", `0 0 ${w} ${h}`)
        .style("display", "block")
        .style("background", "#f4f4f4");

	/* Tooltip stuff. */
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '2px')
        .style('border-radius', '5px')
        .style('padding', '5px');

	/* Get x-axis left-right and on top */
    svg.append("g")
        .attr("transform", `translate(0, ${margin.top})`)
		/* This creates the actual visual axis element from our var from above. */
        .call(d3.axisTop(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "start");

	/* Get y-axis up-down and on left */
    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y))
        .selectAll("text");

	/* Get reference to bars SVG group container. */
    const barsGroup = svg.selectAll("rect")
        .data(data, d => d.name);

	/**
	 * Since the data doesn't inherently have x/y stuff like the d3.pack() 
	 * 	function did for us with circles, we have to manipulate the bars
	 * 	manually.
	 * A lot of what's going on here is similar to the circle pack stuff,
	 * 	except we use some d3 transition stuff when the bars change.
	 */
    barsGroup
		.enter()
        .append("rect")
        .attr("x", margin.left)
        .attr("y", d => y(d.name))
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.value))
        .attr("stroke", "black")
        .attr("id", d => `bar-${correctId(d.name)}`)
        .style("cursor", d => d.children ? "pointer" : "default")
        .transition()
        .duration(1000)
        .attr("x", margin.left)
        .attr("y", d => y(d.name))
        .attr("width", d => x(d.value) - margin.left)
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.value));

    svg.selectAll("rect")
        .on("mouseover", function(event, d) {
            d3.select(this).classed("highlighted", true);
            d3.select(`#circle-${correctId(d.name)}`).classed("highlighted", true);

            tooltip.style("display", "block")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`)
                .text(`${d.name}: ${d.value}`);
        })
        .on("mouseout", function(event, d) {
            d3.select(this).classed("highlighted", false);
            d3.select(`#circle-${correctId(d.name)}`).classed("highlighted", false);
            tooltip.style("display", "none");
        })
        .on("click", function(event, d) {
			if (!d.children) {
				return;
			}
			zoom(event, d3.select(`#circle-${correctId(d.name)}`).datum());
        });

	/* Compute values for "nodes"; used to determine bar graph length. */
	function assignValuesForBars(node)
	{
		if (node.isLeaf)
		{
			/* Some of the characters don't have H/M/S stats... just give them 1. */
			return !isNaN(node.value) ? node.value : 1;
		}
		else
		{
			/* Recursively sums values of all leaf nodes of an internal node. */
			return node.children.reduce((acc, child) => acc + assignValuesForBars(child), 0);
		}
	}
}

function zoom(event, d)
{	if (nodeInFocus === topLevelFocus && d.data.isLeaf) {return;}
	if (nodeInFocus !== d && d) {
	/* Update the nodeInFocus to be the one that called this function. */		
	nodeInFocus = d;

	const transition = svg_circlePack.transition();

	transition.duration(750)
		.tween("zoom", d => {
			const i = d3.interpolateZoom(view, [nodeInFocus.x, nodeInFocus.y, nodeInFocus.r * 2]);
			return t => zoomTo(i(t));
		});

	labelsGroup
		.filter(function(d) { return d.parent === nodeInFocus || this.style.display === "inline"; })
		.transition(transition)
		.style("fill-opacity", d => d.parent === nodeInFocus ? 1 : 0)
		.on("start", function(d) { if (d.parent === nodeInFocus) this.style.display = "inline"; })
		.on("end", function(d) { if (d.parent !== nodeInFocus) this.style.display = "none"; });
		
	/* Bar graph updates to reflect node/level currently in focues */
	createBarGraph();

	/* Title is updated in the same respect. */
	setTitles();
	} else {
		return;
	}
}

/* Does math part of zoom; `v` is an array of coordinates */
function zoomTo(v)
{
	/* `k` is a scale factor; calculated based on the new view’s size relative to the SVG’s width. */
	let k = w_circlePack / v[2];

	view = v;
	
	/* "transform" is an attribute of svg objects */
	labelsGroup.attr("transform",   d => `translate(${(d.x - v[0]) * k}, ${(d.y - v[1]) * k})`); 
	circlesGroup.attr("transform",  d => `translate(${(d.x - v[0]) * k}, ${(d.y - v[1]) * k})`);
	circlesGroup.attr("r",          d => d.r * k);
}

/* Sets groupingSpecifer value and highlights one button at a time per group. */
function handleGroupingClick(specifier, event)
{
	const clickedButton = event.currentTarget;
	
	document.querySelectorAll('#groupingButtons button').forEach(elem => {
	  elem.classList.remove('clicked');
	});

	clickedButton.classList.add('clicked');  

	groupingSpecifier = specifier;

	drawCharts();
}

/* Sets statsSpecifier value and highlights one button at a time per group. */
function handleStatsClick(specifier, event)
{	
	const clickedButton = event.currentTarget;

	document.querySelectorAll('#statsButtons button').forEach(elem => {
	  elem.classList.remove('clicked');
	});
  
	clickedButton.classList.add('clicked');  

	statsSpecifier = specifier;

	drawCharts();
}

/** 
 * Uses d3.group() to create nested array of objects to later give to d3.hierarchy().
 * Assigns values that are useful at other points in the process.
 * This tree is always created dynamically, based on current values 
 * 	of groupingSpecifier and statsSpecifier.
 */
function get_tree()
{
	let data = 
	{
		name: "Skyrim",
		level: 0,
		isLeaf: false,
		children: Array.from(d3.group(characters_array, elem => elem.location), ([city, ungroupedElems]) => ({
				name: city,
				level: 1,
				isLeaf: false,
				children: Array.from(d3.group(ungroupedElems, elem => elem[groupingSpecifier]), ([group, leafs]) => ({
						name: group,
						level: 2,
						isLeaf: false,
						children: leafs.map(character => ({
								name: character.name,
								level: 3,
								isLeaf: true,
								/* 'health' | 'magicka' | 'stamina' */
								value: character[statsSpecifier]
						}))
					})
				)
			})
		)
	}

	return data;
}

/** 
 * This was necessary due to names like "Shor's Stone", which, when 
 * 	used as id's, become invalid selectors. It was either this or 
 * 	change the original data, which would then make labels look weird.
 */
function correctId(string_id)
{
	/* Split string by `'` and ` `; rejoin with nothing. */
	return string_id.split(/[' ]+/).join('');
}

function setTitles() {

	if (!nodeInFocus) {
		title = "Skyrim";
		return;
	}

	let depth = nodeInFocus.data.level;

	if (depth == 0) {
		title = "Skyrim";
		barTitle = `Population ${statsSpecifier.toUpperCase()}`;
	}
	else if (depth == 1) {
		title = nodeInFocus.data.name;
		barTitle = `Group ${statsSpecifier.toUpperCase()}`;
	}
	else if (depth == 2) {
		title = `${nodeInFocus.parent.data.name}: ${nodeInFocus.data.name}`;
		barTitle = `Character ${statsSpecifier.toUpperCase()}`;
	}

	document.getElementById('title').textContent = title;
	document.getElementById('barTitle').textContent = barTitle;
}