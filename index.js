var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

// Blatently derived from https://github.com/bitfocus/companion-module-christie-projector/blob/master/index.js

// Debugging / Logging using ChrRGBLsr not ChristiePj to differentiate our S5 hacks from Std Module






// Functions to Pad numbers to various depths eg 1 to 001

function pad2(num) {
	var s = "00" + num;
	return s.substr(s.length-2);
}

function pad3(num) {
	var s = "000" + num;
	return s.substr(s.length-3);
}

function pad4(num) {
	var s = "0000" + num;
	return s.substr(s.length-4);
}



// Functions that setup instance (variables) for overall config?

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;
	self.init_tcp();
};

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;	    // Normal Debug (keep uncommented as default)
//	debug = console.log;	    // Simple perminent printing of debug options to terminal/CMD if needed
	log = self.log;

	self.status(1,'Connecting'); 	// i.e. Status os OK!
	self.init_tcp();			 // Init TCP
	self.update_variables(); 		  // Export Variables
	self.checkFeedbacks();			   // Export Feedbacks
	self.init_presets();			    // Export Presets
};


instance.prototype.init_tcp = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.host) {
		self.socket = new tcp(self.config.host, self.config.port);

		self.socket.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.status(self.STATE_ERROR, err);
			self.log('error',"Network error: " + err.message);
		});

		self.socket.on('connect', function () {
			self.status(self.STATE_OK);
			debug("Connected");
		})

		self.socket.on('data', function (d) {
			var oldHasData = self.has_data = true;
			var data = String(d);
			var msg;

			// Debug recived packet
			debug('Packet recived: %s', data);

			if (data.includes('ERR')) {
				var data2 = data.substring(data.indexOf('ERR') + 5 ); //changed from 3 as the RGB Lasers use more chars

				if (data2.includes('001')) {
					msg = 'System Crash';
				}

				if (data2.includes('002')) {
					msg = 'System Warning';
				}

				if (data2.includes('003')) {
					msg = 'Invalid Parameter';
				}

				if (data2.includes('004')) {
					msg = 'Too Many Parameters';
				}

				if (data2.includes('005')) {
					msg = 'Too Few Parameters';
				}

				if (data2.includes('006')) {
					msg = 'Source Does Not Exist';
				}

				if (data2.includes('007')) {
					msg = 'Could Not Be Executed';
				}

				if (data2.includes('008')) {
					msg = 'Checksum Error';
				}

				if (data2.includes('009')) {
					msg = 'Unknown Request';
				}

				if (data2.includes('010')) {
					msg = 'Communication Error';
				}

				if (data2.includes('011')) {
					msg = 'RX Break';
				}

				if (data2.includes('012')) {
					msg = 'Supplementary Info';
				}

				debug("Network Warning", data);
				self.status(self.STATE_WARNING, 'Warning');
				self.log('warn', 'Warning ' + msg + ': ' + data);

				debug('ChrRGBLsr: Warning %s: %s', msg, data);
			}

			if (data.includes("FYI")) {                             // Typical packet: '(0002FYI 001 002 003 004 "Some Message")'
				var split_data = [];
				var str = data.substring(data.indexOf('FYI') + 3 ); // Striped down to: ' 001 002 003 004 "Some Message")'

				var x = 0;
				var y = 0;

				// Saves FYI Command
				for (let i = 0; i < 4; i++) { 	        // Stripped down to: ' 001 002 003 004 "Some Message")'
					x = str.indexOf(' ') + 1; 		    // Get first " "
					y = str.indexOf(' ', 1);			// Get seccond " "

					split_data[i] = str.substring(x, y); // Saves the data between two spaces, with above example '001'
					str = str.substring(y); 			// Saves the rest for next cycle: ' 002 003 004 "Some Message")'
				}

				// Saves FYI Message
				msg = data.substring(data.indexOf('"') + 1);	// Saves the data after the first " with above example: 'Some Message")'
				msg = msg.substring(0, msg.indexOf('"', 1)); 	// Saves the data between two ", with above example: 'Some Message'

				// Debugs packet and message to serial
				debug('FYI command recived:');
				debug('Type: %s', split_data[0]);
				debug('P1: %s', split_data[1]);
				debug('P2: %s', split_data[2]);
				debug('P3: %s', split_data[3]);
				debug('Msg: %s', msg);

				// Detect FYI Message Type    ****** IS FYI MSG STILL USED IN LATEST CINELIFE SERIAL??? ****
				switch (split_data[0]) {

					case '001': // Power
						if (split_data[1] == '000') {
							self.power_state = 'Off';
						}
						else if (split_data[1] == '001') {
							self.power_state = 'On';
						}
						else if (split_data[1] == '002') {
							self.power_state = 'Boot';
						}
						else if (split_data[1] == '010') {
							self.power_state = 'Cool Down';
						}
						else if (split_data[1] == '011') {
							self.power_state = 'Warm Up';
						}

						self.setVariable('power_state', self.power_state);
						self.checkFeedbacks('power_state');
						self.has_data = true;
						break;

					case '002': // Proj. Address
						// Do something
						break;

					case '003': // Proj. Selected
						// Do something
						break;

					case '004': // Baud Rate
						// Do something
						break;

					case '005': // Standby
						if (split_data[1] == '000') {
							self.standby = 'Off';
						}
						else if (split_data[1] == '001') {
							self.standby = 'On';
						}

						self.setVariable('standby', self.standby);
						self.checkFeedbacks('standby');
						self.has_data = true;
						break;

					case '006': // Signal
						if (split_data[1] == '000') {
							self.signal_state = 'Good Signal';
						}
						else if (split_data[1] == '001') {
							self.signal_state = 'Signal Missing';
						}
						else if (split_data[1] == '002') {
							self.signal_state = 'Bad Sync';
						}

						self.setVariable('signal_state', self.signal_state);
						self.checkFeedbacks('signal_state');
						self.has_data = true;
						break;

					case '007': // OSD
						if (split_data[1] == '000') {
							self.osd_enabled = 'Off';
						}
						else if (split_data[1] == '001') {
							self.osd_enabled = 'On';
						}

						self.setVariable('osd_enabled', self.osd_enabled);
						self.checkFeedbacks('osd_enabled');
						self.has_data = true;
						break;

					case '009': // Shutter
						if (split_data[1] == '000') {
							self.shutter_closed = 'Open';
						}
						else if (split_data[1] == '001') {
							self.shutter_closed = 'Closed';
						}

						self.setVariable('shutter_closed', self.shutter_closed);
						self.checkFeedbacks('shutter_closed');
						self.has_data = true;
						break;

					case '010': // Input
							self.input_channel = split_data[1];
							self.input_slot = self.inputSelect[Number(split_data[3]) - 1].id;

							self.setVariable('input_channel', self.input_channel);
							self.setVariable('input_slot', self.inputSelect[Number(split_data[3])-1].label);
							self.checkFeedbacks('input_channel');
							self.checkFeedbacks('input_slot');
							self.has_data = true;
							break;

					case '011': // Picture Myte.
						// Do something
						break;

					case '012': // PIP
						if (split_data[1] == '000') {
							self.pip_enabled = 'Off';
						}
						else if (split_data[1] == '001') {
							self.pip_enabled = 'On';
						}

						self.setVariable('pip_enabled', self.pip_enabled);
						self.checkFeedbacks('pip_enabled');
						self.has_data = true;
						break;

					case '255': // General / Misc.
						// Do something
						break;

					default:
						break;
				}

			}


			
			
			
// ********************* PROJECTOR COMMANDS ************
			
			
			
			
			
			
// LPH = LAMP HOURS COMMANDS

			if (data.includes("LPH")) {
				var split_data = [];
				var str = data.substring(data.indexOf('LPH') + 3 );

				var x = 0;
				var y = 0;

				for (let i = 0; i < 4; i++) { 	// Striped down to: ' 001 002 003 004 "Some Message")'
					x = str.indexOf(' ') + 1; 		// Get first " "
					y = str.indexOf(' ', 1);			// Get seccond " "

					split_data[i] = str.substring(x, y); // Saves the data between two spaces, with above example '001'
					str = str.substring(y); 			// Saves the rest for next cycle: ' 002 003 004 "Some Message")'
				}

				msg = data.substring(data.indexOf('"') + 1);	// Saves the data after the first " with above example: 'Some Message")'
				msg = msg.substring(0, msg.indexOf('"', 1)); 	// Saves the data between two ", with above example: 'Some Message'

				debug('LPH command recived:');
				debug('Lamp 1: %s', split_data[0]);
				debug('Lamp 2: %s', split_data[1]);
				debug('Msg: %s', msg);

				self.lamp_1 = split_data[0];
				self.lamp_2 = split_data[1];

				self.setVariable('lamp_1', self.lamp_1);
				self.setVariable('lamp_2', self.lamp_2);
				self.has_data = true;
			}

			// Migth need some code to request current setup.
			// For now it should react to changes, but need someone to test to be sure.

			// Initial data from Christie
			if (oldHasData != self.has_data && self.has_data) {
				self.checkFeedbacks();
				self.update_variables();
			}

		})
	}
};







// Return config fields for web config

instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module controls Christie projectors,input selection will be added later since we need to fetch the input port information from the projector. NB: Adapted for Sector5 needs in the SSSR for dual RGB laser projectors by ASP.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 6,
			regex: self.REGEX_IP
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Target port (Default = 5000) not 3002',
			width: 6,
			default: '5000',
			regex: self.REGEX_PORT
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
	}

	debug("destroy", self.id);
};



// various mappings for states to appropriate ID numbers follows
instance.prototype.OnOff = [
	{ label: 'OFF',			id: '0' },
	{ label: 'ON',			id: '1' },
];


instance.prototype.EnableDisable = [
	{ label: 'Disable',	id: '0' },
	{ label: 'Enable',	id: '1' },
];


instance.prototype.shutter = [
	{ label: 'Open',		id: '0' },
	{ label: 'Close',		id: '1' },
];


/* instance.prototype.tpatRGBLaser = [                        // <--- Our Patterns
	{ label: 'Off',                            id: '0' },  // assigned to numeric
	{ label: 'DC4K Framing2',                  id: '1' },  // IDs probably won't work
	{ label: 'RGB-12bit-MacBeth ColorChecker', id: '2' },
	{ label: 'RGB-12bit-Color Bars',           id: '3' },
	{ label: 'RGB-12bit-Color Board',          id: '4' },
	{ label: 'RGB-12bit-Full Screen White',    id: '5' },
	{ label: 'DC4K Framing Red',               id: '6' },
	{ label: 'DC4K Framing Green',             id: '7' },
	{ label: 'RGB-4K-8bit-3D Dynamic Range',   id: '8' },
	{ label: 'RGB-4K-8bit-3D Four Quadrant',   id: '9' },
	{ label: 'DC4K Safeimage_185',             id: '10'},
	{ label: 'DC4K Safeimage_239',             id: '11'},
	{ label: '-12-not_assigned-',              id: '12'},
	{ label: '-13-not_assigned-',              id: '13'},
	{ label: '-14-not_assigned-',              id: '14'},
	{ label: '-15-not_assigned-',              id: '15'},
	{ label: '-16-not_assigned-',              id: '16'},
	{ label: '-17-not_assigned-',              id: '17'},
	{ label: '-18-not_assigned-',              id: '18'}
]; */

instance.prototype.tpatRGBLaser = [                        // <--- Our Patterns
	{ label: 'Off',                            id: 'Off' },  // Should just use real
	{ label: 'Frame with Centre Target',       id: 'DC4K Framing2' },  // names not ID no's?
	{ label: 'MacBeth Colour Checker',         id: 'RGB-12bit-MacBeth ColorChecker' },
	{ label: 'Colour Bars',                    id: 'RGB-12bit-Color Bars' },
	{ label: 'Colour Board Diag',              id: 'RGB-12bit-Color Board' },
	{ label: 'Full Screen White',              id: 'RGB-12bit-Full Screen White' },
	{ label: 'DC4K Frame Red LHS',             id: 'DC4K Framing Red' },
	{ label: 'DC4K Frame Grn RHS',             id: 'DC4K Framing Green' },
	{ label: '3D Dynamic Range',               id: 'RGB-4K-8bit-3D Dynamic Range' },
	{ label: '3D Four Quadrant',               id: 'RGB-4K-8bit-3D Four Quadrant' },
	{ label: '1.85 DC4K Safe Image',           id: 'DC4K Safeimage_185'},
	{ label: '2.39 DC4K Safe Image',           id: 'DC4K Safeimage_239'},
	{ label: '-12-not_assigned-',              id: '12'},
	{ label: '-13-not_assigned-',              id: '13'},
	{ label: '-14-not_assigned-',              id: '14'},
	{ label: '-15-not_assigned-',              id: '15'},
	{ label: '-16-not_assigned-',              id: '16'},
	{ label: '-17-not_assigned-',              id: '17'},
	{ label: '-18-not_assigned-',              id: '18'}
];


/* instance.prototype.chNames = [                        // <--- Channel Names 
	{ label: 'HiDef',	            id: '0' }, // as Numeric IDs 
	{ label: 'Avid',		        id: '1' },
	{ label: '3D QuadSDI L (Dual)',	id: '2' },
	{ label: '3D QuadSDI R (Dual)',	id: '3' },
	{ label: 'AppleTV',         	id: '4' },
	{ label: '-05-not_assigned-',   id: '5' },
	{ label: '-06-not_assigned-',   id: '6' },
	{ label: '-07-not_assigned-',   id: '7' },
	{ label: '-08-not_assigned-',   id: '8' },
	{ label: '-09-not_assigned-',   id: '9' },
	{ label: '-10-not_assigned-',   id: '10'}
]; */

instance.prototype.chNames = [                        // <--- Channel Names, named 
	{ label: 'HiDef',	            id: 'HiDef' },
	{ label: 'Avid',		    id: 'Avid' },
	{ label: '3D QuadSDI L (Dual)',	    id: '3D QuadSDI L (Dual)' },
	{ label: '3D QuadSDI R (Dual)',	    id: '3D QuadSDI R (Dual)' },
	{ label: 'AppleTV',         	    id: 'AppleTV' },
	{ label: '-05-not_assigned-',       id: '5' },
	{ label: '-06-not_assigned-',       id: '6' },
	{ label: '-07-not_assigned-',       id: '7' },
	{ label: '-08-not_assigned-',       id: '8' },
	{ label: '-09-not_assigned-',       id: '9' },
	{ label: '-10-not_assigned-',       id: '10'}
];




//  **********************  FUNCTIONS  **************************
//  *******  SEVERELY HACKED BACK TO JUST WHATS NEEDED  *********


instance.prototype.init_presets = function () {
	var self = this;
	var presets = [];
	var pstSize = '18';




	// Focus
	presets.push({
		category: 'Lens',
		label: 'Focus',
		bank: {
			style: 'text',
			text: 'Focus 4000',
			size: 'auto',
			color: '16777215',
			bgcolor: self.rgb(0, 0, 0)
		},
		actions: [
			{
				action: 'fcs',
				options: {
					p1: '4000'
				}
			}
		],
	});


	// ###################### Input Channel ######################

	// Set Input Channel                 // PROBABLY IRRELEVENT NOW
	for (let i = 0; i < 50; i++) {       // AS PROBABLY JUST USES
		presets.push({                   // CHANNEL NAMES NOT ID'S?
			category: 'Select Channel',
			label: 'CH ' + (i+1),
			bank: {
				style: 'text',
				text: 'CH ' + (i+1),
				size: 'auto',
				color: '16777215',
				bgcolor: 0
			},
			actions: [{
				action: 'cha',
				options: {
					p1: (i+1),
				}
			}],
			feedbacks: [
				{
					type: 'input_channel',
					options: {
						fg1: self.rgb(255, 255, 255),
						bg1: self.rgb(255, 0, 0),
						input: (i+1)
					}
				}
			]
		});

	}



	// ################## Internal Test Pattern (HACKED FOR RGB LASER) ###################

	// Internal Test Pattern (General/Basic)
	for (var input in self.tpatBasic) {
		presets.push({
			category: 'Test Patterns',
			label: 'Internal Test Pattern (RGB Laser) ' + self.tpatRGBLaser[input].label,
			bank: {
				style: 'text',
				text: 'ITP ' + self.tpatRGBLaser[input].label,
				size: '14',
				color: '16777215',
				bgcolor: 0
			},
			actions: [{
				action: 'tpatRGBLaser',
				options: {
					p1: self.tpatRGBLaser[input].label,
				}
			}]
		});
	}


	// Power ON / OFF
	for (var input in self.OnOff) {
		presets.push({
			category: 'Commands',
			label: 'Power ' + self.OnOff[input].label,
			bank: {
				style: 'text',
				text: 'PWR ' + self.OnOff[input].label +' $(ChrRGBLsr:power_state)',
				size: 'auto',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 0)
			},
			actions: [
				{
					action: 'pwr',
					options: {
						p1: self.OnOff[input].id
					}
				}
			],
			feedbacks: [
				{
					type: 'power_state',
					options: {
						fg1: self.rgb(255, 255, 255), //white
						fg2: self.rgb(0, 0, 0),       //black
						bg1: self.rgb(0, 204, 0),     //green
						bg2: self.rgb(255, 0, 0),     //red
						bg3: self.rgb(255, 255, 0),   //yellow
						bg4: self.rgb(255, 0, 255),   //magenta
						bg5: self.rgb(0, 255, 255),   //cyan
					}
				}
			]
		});
	}

	// Shutter Open / Close
	for (var input in self.shutter) {
		presets.push({
			category: 'Commands',
			label: 'Shutter ' + self.shutter[input].label,
			bank: {
				style: 'text',
				text: 'Shutter ' + self.shutter[input].label,
				size: 'auto',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 0)
			},
			actions: [
				{
					action: 'shu',
					options: {
						p1: self.shutter[input].id
					}
				}
			],
			feedbacks: [
				{
					type: 'shutter_closed',
					options: {
						fg1: self.rgb(255, 255, 255),
						bg1: self.rgb(255, 0, 0),
						bg2: self.rgb(0, 204, 0),
					}
				}
			]
		});
	}

	



	// ###################### Status ######################

	// Power State
	presets.push({
		category: 'Status',
		label: 'Show Power State',
		bank: {
			style: 'text',
			text: 'PWR: $(ChrRGBLsr:power_state)',
			size: 'auto',
			color: '16777215',
			bgcolor: self.rgb(0, 0, 0)
		},
		feedbacks: [
			{
				type: 'power_state',
				options: {
					fg1: self.rgb(255, 255, 255), //white
					fg2: self.rgb(0, 0, 0),       //black
					bg1: self.rgb(0, 204, 0),     //green
					bg2: self.rgb(255, 0, 0),     //red
					bg3: self.rgb(255, 255, 0),   //yellow
					bg4: self.rgb(255, 0, 255),   //magenta
					bg5: self.rgb(0, 255, 255),   //cyan
				}
			}
		]
	});

	
	// Shutter State
	presets.push({
		category: 'Status',
		label: 'Show Shutter Status',
		bank: {
			style: 'text',
			text: 'Shutter: $(ChristiePj:shutter_closed)',
			size: 'auto',
			color: '16777215',
			bgcolor: self.rgb(0, 0, 0)
		},
		feedbacks: [
			{
				type: 'shutter_closed',
				options: {
					fg1: self.rgb(255, 255, 255), //white
					bg1: self.rgb(255, 0, 0),     //red
					bg2: self.rgb(0, 204, 0),     //green
				}
			}
		]
	});

	
	// Input Channel
	presets.push({
		category: 'Status',
		label: 'Show Input Channel',
		bank: {
			style: 'text',
			text: 'CH: $(ChristiePj:input_channel)',
			size: 'auto',
			color: '16777215',
			bgcolor: self.rgb(0, 0, 0)      //black
		},
	});






// ***** POP-UP LABELS ETC ******

instance.prototype.actions = function(system) {
	var self = this;

	self.system.emit('instance_actions', self.id, {




		'cha': {
			label: 'Channel Select',
			options: [
				{
					type: 'number',
					id: 'p1',
					label: 'Channel Number (1-50)',
					min: 1,
					max: 50,
					default: 1,
					required: true,
					range: false,
					regex: self.REGEX_NUMBER
				},
			]
		},


		'itpRGBLaser': {
			label: 'Internal testpattern RGB Laser Projectors (hacked!)',
			options: [
				{
					type: 'text',
					id: 'info',
					width: 12,
					label: 'Information',
					value: 'Need to refine for the 4435s'
				},
				{
					type: 'dropdown',
					label: 'Select Testpattern',
					id: 'p1',
					default: '1',
					choices: self.tpatRGBLaser
				}
			]
		},
		
	
	
	
	
		'pwr': {
			label: 'Power On/Off',
			options: [
				{
					type: 'dropdown',
					label: 'On / Off',
					id: 'p1',
					default: '1',
					choices: self.OnOff
				}
			]
		},
		
		
			'shu': {
			label: 'Shutter Open / Close',
			options: [
				{
					type: 'dropdown',
					label: 'Open / Close',
					id: 'p1',
					default: '0',
					choices: self.shutter
				}
			]
		},
		
		
		
		
		
		'zom':  {
			label: 'Zoom (Fixed)',
			options: [
				{
					type: 'number',
					id: 'p1',
					label: 'Zoom Set (0-9999)',
					min: 0,
					max: 9999,
					default: 5000,
					required: true,
					range: false,
					regex: self.REGEX_NUMBER
				},
			]
		},

	});
};



// ****************  ACTIONS FOR GIVEN COMMAND TYPE ***************
// **************** THIS IS WHERE THE MAGIC HAPPENS ***************
// ***** INITIAL CODE SENDS NUMERIC VALUES NOT NAMES TO PROJ ******


instance.prototype.action = function(action) {
	var self = this;
	var opt = action.options
	var cmd

	switch (action.action) {
		case 'aut': // automation
			cmd = '(ALC ' + opt.p1 + ')';
			break;

		case 'cha': // channel
			cmd = '(CHA ' + opt.p1 + ')'; // was cmd = '(CHA ' + pad2(opt.p1) + ')';
			break;

		case 'dlc': // loaded content duration
			cmd = '(DEF ' + opt.p1 + ')';
			break;

		case 'fcs': //focus lens position adjustment
			cmd = '(FCS ' + pad4(opt.p1) + ')';
			break;

		case 'gam': //gamma control
			cmd = '(GAM ' + opt.p1 +')';
			break;

		case 'hlp': //serial help
			cmd = '(HLP' + opt.p1 + ')';
			break;
			
		case 'ilf': //ILS File
			cmd = '(ILF ' + opt.p1 +')';
			break;

		case 'ils': //ILS Setup
			cmd = '(ILS ' + opt.p1 +')';
			break;

		case 'inr': //Interrogator
			cmd = '(IOP ' + opt.p1 +')';
			break;

		case 'itpRGBLaser':            // Internal Test Patterns for RGB Laser Projectors
			cmd = '(ITP ' + opt.p1 + ')';        // Not exhaustive
			break;  

		case 'jog': //jog content
			cmd = '(JOG ' + opt.p1 + ')';
			break;

		case 'lho': //lens horizontal position adjustment *** GEO ***
			cmd = '(LHO)';
			break;

		case 'lml': //LampLoc
			cmd = '(LML ' + opt.p1 + ')';
			break;

		case 'lpm': //Lamp Mode
			cmd = '(LPM ' + opt.p1 + ')';
			break;

		case 'lpp': //Lamp Power
			cmd = '(LPP ' + opt.p1 + ')';
			break;

		case 'lvo': //Lens Vertical Position Adjustment  *** GEO ***
			cmd = '(LVO ' + opt.p1 + ')';
			break;

		case 'mcg': //measured colour gamut, not a cricket ground
			cmd = '(MCG ' + opt.p1 + ')';
			break;

		case 'msg': //message, not a flavour enhancer
			cmd = '(MSG ' + opt.p1 + ')';
			break;

		case 'ply': //Play Content
			cmd = '(PLY)';
			break;
			
		case 'png': //Ping
			cmd = '(PNG)';
			break;
			
		case 'pus': //Pause or Resume Content
			cmd = '(PUS)';
			break;

		case 'pwr': //Power
			cmd = '(PWR ' + opt.p1 + ')';
			break;

		case 'shu': // Shutter Adjustment ie Douser
			cmd = '(SHU ' + pad3(opt.p1) +')';
			break;

		case 'sst': // system status
			cmd = '(SST ' + opt.p1 +')';
			break;

		case 'stp': // Stop content
			cmd = '(STP)';
			break;

		case 'tcg': // target colour gamut
			cmd = '(TCG ' + opt.p1 +')';
			break;

		case 'tmd': // time and date
			cmd = '(TMD ' + opt.p1 +')';
			break;

		case 'uid': // User ID
			cmd = '(UID ' + opt.p1 +')';
			break;

		case 'uld': // Unload Content
			cmd = '(ULD)';
			break;

		case 'zom': // Lens Zoom Position Adjustment   *** GEO ***
			cmd = '(ZOM ' + pad4(opt.p1) + ')';
			break;

		//TO DO make input select need to fetch the available input configurations from the projector


	}

	if (cmd !== undefined) {

		debug('sending ',cmd,"to",self.config.host);

		if (self.socket !== undefined && self.socket.connected) {
			self.socket.send(cmd);
			self.status(self.STATE_OK);
		}
		else {
			debug('Socket not connected :(');
		}

	}

	// debug('action():', action);

};

instance.prototype.update_variables = function (system) {
	var self = this;
	var variables = [];

	variables.push({
		label: 'Power State',
		name: 'power_state'
	});

	variables.push({
		label: 'Standby',
		name: 'standby'
	});

	variables.push({
		label: 'Signal State',
		name: 'signal_state'
	});

	variables.push({
		label: 'OSD Enabled',
		name: 'osd_enabled'
	});

	variables.push({
		label: 'Shutter State',
		name: 'shutter_closed'
	});

	variables.push({
		label: 'Input Channel',
		name: 'input_channel'
	});

	variables.push({
		label: 'Input Slot',
		name: 'input_slot'
	});

	variables.push({
		label: 'PIP Enabled',
		name: 'pip_enabled'
	});

	self.setVariable('power_state', 	self.power_state);
	self.setVariable('standby', 		self.standby);
	self.setVariable('signal_state', 	self.signal_state);
	self.setVariable('osd_enabled', 	self.osd_enabled);
	self.setVariable('shutter_closed', 	self.shutter_closed);
	self.setVariable('input_channel', 	self.input_channel);
	self.setVariable('input_slot', 		self.inputSelect.label);
	self.setVariable('pip_enabled', 	self.pip_enabled);

	self.setVariableDefinitions(variables);



	// feedbacks ***********************************************************
	//           ******************** AND COLOURS **************************
	
	var feedbacks = {};

	feedbacks['power_state'] = {
		label: 'Power State',
		description: 'Change colors of bank depending on Power State',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color light',
				id: 'fg1',
				default: self.rgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Foreground color dark',
				id: 'fg2',
				default: self.rgb(0,0,0)
			},
			{
				type: 'colorpicker',
				label: 'Background color on',
				id: 'bg1',
				default: self.rgb(0,204,0) // Green
			},
			{
				type: 'colorpicker',
				label: 'Background color off',
				id: 'bg2',
				default: self.rgb(255,0,0) // Red
			},
			{
				type: 'colorpicker',
				label: 'Background color boot mode',
				id: 'bg3',
				default: self.rgb(255,255,0) // Yellow
			},
			{
				type: 'colorpicker',
				label: 'Background color cooldown',
				id: 'bg4',
				default: self.rgb(0,255,255) // Cyan
			},
			{
				type: 'colorpicker',
				label: 'Background color warm up',
				id: 'bg5',
				default: self.rgb(255,0,255) // Magenta
			}
		]
	};

	feedbacks['standby'] = {
		label: 'Standby On / Off',
		description: 'Change colors of bank if standby mode is on or not',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg1',
				default: self.rgb(255,255,255) // White
			},
			{
				type: 'colorpicker',
				label: 'Background color Off',
				id: 'bg1',
				default: self.rgb(255,204,229) // Pink
			},
			{
				type: 'colorpicker',
				label: 'Background color On',
				id: 'bg2',
				default: self.rgb(204,255,229) // Pale Green
			}
		]
	};

	feedbacks['signal_state'] = {
		label: 'Signal Status',
		description: 'Change colors of bank depending on signal status',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color light',
				id: 'fg1',
				default: self.rgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Foreground color dark',
				id: 'fg2',
				default: self.rgb(0,0,0)
			},
			{
				type: 'colorpicker',
				label: 'Background color good signal',
				id: 'bg1',
				default: self.rgb(0,204,0) // Green
			},
			{
				type: 'colorpicker',
				label: 'Background color signal missing',
				id: 'bg2',
				default: self.rgb(255,0,0) // Red
			},
			{
				type: 'colorpicker',
				label: 'Background color bad sync',
				id: 'bg3',
				default: self.rgb(255,255,0) // Yellow
			}
		]
	};


	feedbacks['shutter_closed'] = {
		label: 'Shutter is closed',
		description: 'Change colors of bank if the shutter is closed',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg1',
				default: self.rgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Background color Closed',
				id: 'bg1',
				default: self.rgb(255,0,0) // Red
			},
			{
				type: 'colorpicker',
				label: 'Background color Open',
				id: 'bg2',
				default: self.rgb(0,204,0) // Green
			}
		]
	};

	feedbacks['input_channel'] = {
		label: 'Video Channel: Change background color',
		description: 'If the channel specified is the active video channel, change colors of the bank',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg1',
				default: self.rgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg1',
				default: self.rgb(255,0,0) // Red
			},
			{
				type: 'number',
				id: 'input',
				label: 'Channel: (1-50)',
				min: 1,
				max: 50,
				default: 1,
				required: true,
				range: false,
				regex: self.REGEX_NUMBER
			}
		]
	};



// **************** FEEDBACK DEFINITIONS ********************************

	self.setFeedbackDefinitions(feedbacks);
};

instance.prototype.feedback = function(feedback, bank) {
	var self = this;

	if (feedback.type == 'power_state') {
		if (self.power_state === 'On') {
			return {
				color: feedback.options.fg1,
				bgcolor: feedback.options.bg1
			};
		}
		else if (self.power_state === 'Off') {
			return {
				color: feedback.options.fg1,
				bgcolor: feedback.options.bg2
			};
		}
		else if (self.power_state === 'Boot') {
			return {
				color: feedback.options.fg2,
				bgcolor: feedback.options.bg3
			};
		}
		else if (self.power_state === 'Cool Down') {
			return {
				color: feedback.options.fg2,
				bgcolor: feedback.options.bg4
			};
		}
		else if (self.power_state === 'Warm Up') {
			return {
				color: feedback.options.fg2,
				bgcolor: feedback.options.bg5
			};
		}
	}




	else if (feedback.type == 'standby') {
		if (self.standby === 'Off') {
			return {
				color: feedback.options.fg1,
				bgcolor: feedback.options.bg1
			};
		}
		else if (self.standby === 'On') {
			return {
				color: feedback.options.fg1,
				bgcolor: feedback.options.bg2
			};
		}
	}




	else if (feedback.type == 'signal_state') {
		if (self.signal_state === 'Good Signal') {
			return {
				color: feedback.options.fg1,
				bgcolor: feedback.options.bg1
			};
		}
		else if (self.signal_state === 'Signal Missing') {
			return {
				color: feedback.options.fg1,
				bgcolor: feedback.options.bg2
			};
		}
		else if (self.signal_state === 'Bad Sync') {
			return {
				color: feedback.options.fg2,
				bgcolor: feedback.options.bg3
			};
		}
	}



	else if (feedback.type == 'shutter_closed') {
		if (self.shutter_closed === 'Closed') {
			return {
				color: feedback.options.fg1,
				bgcolor: feedback.options.bg1
			};
		}
		else if (self.shutter_closed === 'Open') {
			return {
				color: feedback.options.fg1,
				bgcolor: feedback.options.bg2
			};
		}
	}



	else 	if (feedback.type == 'input_channel') {
		if (self.input_channel == pad3(feedback.options.input)) {
			return {
				color: feedback.options.fg1,
				bgcolor: feedback.options.bg1
			};
		}
	}




};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
