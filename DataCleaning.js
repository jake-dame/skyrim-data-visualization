import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export async function get_JSON_character_objects()
{
	const JSON_FILE_PATH = "resources/SkyrimGraph.json";

	/* Get a js array of JSON objects from file */
	let characters_raw = [];
	try {
		characters_raw = await d3.json(JSON_FILE_PATH);
	} catch(e) {
		console.error("EXCEPTION [get_JSON_character_objects]: ", e);
	}

	let characters_cleaned = characters_raw.map(clean_character);

	let selected_characters = select_characters(characters_cleaned);

	return selected_characters;
}

function clean_character(character)
{
	/* Sets location of character based on what was provided in the JSON file. */
	function get_location(character)
	{
		let location = "";

		if ("Home City" in character) {
			location = character["Home City"];
		} else if ("Home Town" in character) {
			location = character["Home Town"];
		} else if ("Location" in character) {
			location = character["Location"];
		} else {
			location = "none";
		}

		location = location.split(", ")[0];

		return location;
	}

	/* Replace unicode weird spaces from JSON file with normal ones; .map() is a js array method that returns a new js array after apply the function or whatever is passed */
	function fix_spaces_in_json_keys(jobj)
	{
		let new_jobj = {};
		for (let key in jobj)
		{
			let fixed_key = key.split("\u00A0").join(" "); /* Splits into string array by weird space; joins all strings in array back together with normal space. */
			new_jobj[fixed_key] = jobj[key];
		}
		return new_jobj;
	}

	character = fix_spaces_in_json_keys(character);

	/* Picks and chooses the attributes we want to work with, with a little bit of parsing/cleaning and error-handling */
	let cleaned_character =
	{
		name: character["Name"] ? character["Name"].trim() : "none",
		location: get_location(character).trim(),
		race: character["Race"] ? character["Race"].trim() : "none",
		gender: character["Gender"] ? character["Gender"].trim() : "none",
		class: character["Class"] ? character["Class"].trim() : "none",
		morality: character["Morality"] ? character["Morality"].trim() : "none",
		aggression: character["Aggression"] ? character["Aggression"].trim() : "none",
		faction: character["Faction(s)"]
			? character["Faction(s)"].split("; ").map(a_faction => a_faction.trim()) // array
			: "none",
		skill:    character["Primary Skills"]
			? character["Primary Skills"].split(", ")[0].trim() // array; we're just taking the first skill though
			: "none",
		health: parseInt(character["Health"]),
		magicka: parseInt(character["Magicka"]),
		stamina: parseInt(character["Stamina"])
	};

	return cleaned_character;
}

function select_characters(characters)
{
	let sett = new Set();

	for (let i in characters)
	{
		if( !sett.has(characters[i].name) )
		{
			sett.add(characters[i].name);
		}
		else
		{
			characters[i].location = "x";
		}

		let loc = characters[i].location;

		if (loc == "Solitude"
			|| loc == "Castle Dour"
			|| loc == "Solitude Sewers"
			|| loc == "Solitude then Windhelm"
			|| loc == "Wandering the streets near the Bards College")
		{
			characters[i].location = "Solitude";
		}
		else if (loc == "Helgen"
				|| loc == "Helgen Keep"
				|| loc == "Helgen/Helgen Keep")
		{
			characters[i].location = "Helgen";
		}
		else if (loc == "Rorikstead")
		{
			characters[i].location = "Rorikstead";
		}
		else if (loc == "Morthal")
		{
			characters[i].location = "Morthal";
		}
		else if (loc == "Kynesgrove")
		{
			characters[i].location = "Kynesgrove";
		}
		else if (loc == "Riverwood")
		{
			characters[i].location = "Riverwood";
		}
		else if (loc == "Karthwasten")
		{
			characters[i].location = "Karthwasten";
		}
		else if (loc == "Ivarstead")
		{
			characters[i].location = "Ivarstead";
		}
		else if (loc == "Falkreath"
				|| loc == "Falkreath Jail")
		{
			characters[i].location = "Dawnstar";
		}
		else if (loc == "Dragon Bridge")
		{
			characters[i].location = "Dragon Bridge";
		}
		else if (loc == "Dawnstar"
				|| loc == "Outside Dawnstar or Riften")
		{
			characters[i].location = "Dawnstar";
		}
		else if (loc == "Dark Brotherhood Sanctuary"
				|| loc == "Dawnstar Sanctuary")
		{
			characters[i].location = "Falkreath Sanctuary";
		}
		else if (loc == "Riften"
				|| loc == "Riften (After his quest)"
				|| loc == "Riften Docks"
				|| loc == "Riften Jail"
				|| loc == "The Ragged Flagon - Cistern"
				|| loc == "The Ratway")
		{
			characters[i].location = "Riften";
		}
		else if (loc == "Windhelm"
				|| loc == "Northern Maiden (Windhelm)"
				|| loc == "Outside Windhelm or Solitude")
		{
			characters[i].location = "Windhelm";
		}
		else if (loc == "Winterhold"
				|| loc == "The Midden"
				|| loc == "The Midden Dark")
		{
			characters[i].location = "Winterhold";
		}
		else if (characters[i].name == "Nazeem")
		{
			characters[i].location = "The Cloud District";
		}
		else if (loc == "Whiterun"
				|| loc == "The Bannered Mare")
		{
			characters[i].location = "Whiterun";
		}
		else if (loc == "Stonehills")
		{
			characters[i].location == "Stonehills";
		}
		else if (loc == "Shor's Stone")
		{
			characters[i].location == "Shor's Stone";
		}
		else if (loc == "Markarth"
				|| loc == "Markarth Ruins"
				|| loc == "Outside Whiterun or Markarth"
				|| loc == "Silver-Blood Inn"
				|| loc == "Temple of Dibella"
				|| loc == "Understone Keep"
				|| loc == "Left Hand Mine"
				|| loc == "Left Hand Miner's Barracks")
		{
			characters[i].location = "Markarth";
		}
		else
		{
			characters[i].location = "x";
		}
	}

	let selected_characters = [];
	for (let i in characters)
	{
		if(characters[i].location != "x"
		&& characters[i].gender != "none" && characters[i].gender != "Radiant" 
		)
		{
			selected_characters.push(characters[i]);
		}


	}

	return selected_characters;
}
