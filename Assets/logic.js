//      *** Day Planner  ***     
//
//      Uses jQuery & moment.js
//

//#region Declarations

//  **  Declarations

const _HOURS_INDAY = 24;
const _MINUTES_INHOUR = 60;
const _TIMEBLOCK_CLASS = "time-block hour ";
const _TIMEBLOCK_CLASS_PAST = "past";
const _TIMEBLOCK_CLASS_PRESENT = "present";
const _TIMEBLOCK_CLASS_FUTURE = "future";
const _MARGINFORPRESENT_INHOURS = 1;

const _REDUCE_EVENTDURATION_TOFIT = true;
const _LOCALSTORAGE_VARIABLENAME = "dayPlannerData"

var _plannerDate = moment();
var _dayHours = [];
var _currentHourIndex = -1;
var _isDeletePressed = false;


//  Generates an HourBlock object. USE ONLY WITH 'NEW' VARIABLE INSTANCES!
//      e.g., var myNewHour = new HourBlock(moment());
function HourBlock(hourDate) {
    this.dateOfHour = hourDate;
    this.index = hourDate.hour();
    this.eventItems = [];
    this.minutesInHour = _MINUTES_INHOUR;

    let hourString = hourDate.hour().toString();
    if (hourString.length == 1) {
        hourString = "0" + hourString;
    }
    this.name = hourString + "h00";
    
    //  Generates the total time allocated
    this.timeUsed = function(indexToOmit) {
        var totalTime = 0;
        this.eventItems.forEach(function (element, elementIndex) {
            if (elementIndex != indexToOmit) {
                totalTime += element.minutes;
            };
        });
        return totalTime;
    };
    //  Calculates the total time unallocated
    this.timeRemaining = function() {
        var totalTime = this.timeUsed(-1);
        return this.minutesInHour - totalTime;
    };
    //  If sufficient time remains, adds the specified event
    //      N.B. -- If _REDUCE_EVENTDURATION_TOFIT, the duration of the event may be shortened.
    //              This is primarily to accommodate hour-overflow, a planned future feature.
    this.addEventItem = function(eventItem_ToAdd) {
        var returnValue = false;
        var totalTime = this.timeUsed(-1);
        if (totalTime + eventItem_ToAdd.minutes <= this.minutesInHour) {
            this.eventItems.push(eventItem_ToAdd);
            returnValue = true;
        
        } else if ((totalTime < _MINUTES_INHOUR) && (_REDUCE_EVENTDURATION_TOFIT)) {
            eventItem_ToAdd.minutes = _MINUTES_INHOUR - totalTime;
        };
        return returnValue;
    };
    //  If sufficient time remains, replaces one event with the specified one
    this.setEventItem = function(eventItem_ToAdd, indexOfItem) {
        var returnValue = false;
        var totalTime = this.timeUsed(indexOfItem);        
        if (totalTime + eventItem_ToAdd.minutes <= this.minutesInHour) {
            this.eventItems[indexOfItem] = eventItem_ToAdd;
            returnValue = true;
        }
        return returnValue;
    };
    //  Deletes the indicated event
    this.removeEventItem = function(indexOfItem) {
        var returnValue = false;
        if ((indexOfItem > -1) && (indexOfItem < this.eventItems.length)) {
           this.eventItems.splice(indexOfItem, 1);
            returnValue = true;
        };

        return returnValue;
    };
    //  Creates and appends a block for this hour on the page
    this.makeBlock = function () {
        var divNew = $('<div class="container">');
        var topLine = $('<div class="row border-0">');
        var topLineTime = $('<span class="col-12">').text(this.name);
        
        var bottomLine = $('<div class="row border-0 d-inline-flex col-12">');        
        var bottomLineSlot = [];

        var className = _TIMEBLOCK_CLASS;
        var relationToPresent = this.isInThePresent(_MARGINFORPRESENT_INHOURS);

        topLine.append(topLineTime);

        for (var i = 0; i < this.eventItems.length; i++) {
            var spanColumns = 3 * Math.floor(this.eventItems[i].minutes / 15);

            bottomLineSlot[i] = $('<span>');
            bottomLineSlot[i].addClass("flex-shrink-1 text-truncate col-" + spanColumns.toString());
            bottomLineSlot[i].text(this.eventItems[i].name);

            bottomLine.append(bottomLineSlot[i]);
        };

        divNew.append(topLine, bottomLine);

        if (relationToPresent > 0) {
            className += _TIMEBLOCK_CLASS_FUTURE;
        } else if (relationToPresent == 0) {
            className += _TIMEBLOCK_CLASS_PRESENT;
        } else {
            className += _TIMEBLOCK_CLASS_PAST;
        }

        divNew.addClass(className);
        divNew.attr("id", this.name);

        $("#timeblocks").append(divNew);
    };
    //  Based on the current time and within the given margin, specifies the state of this hour
    this.isInThePresent = function (hoursMargin) {
        //  Returns -1 for past, 0 for present, 1 for future.
        var returnValue = 0;
        let beforeTime = this.dateOfHour.clone().subtract(hoursMargin, "hours");
        let afterTime = this.dateOfHour.clone().add(hoursMargin, "hours");

        if (moment().isBefore(beforeTime)) {
            returnValue = 1;
        } else if (moment().isAfter(afterTime)) {
            returnValue = -1;
        }

        return returnValue;
    };
    //  Packages the object for shipping
    this.forJSON = function() {
        return {
            name: this.name,
            hourDate: this.dateOfHour.toJSON(),
            index: this.index,
            eventItems: this.eventItems,
            minutesInHour: this.minutesInHour,
        }
    };
    //  Unpacks the object for use
    this.fromJSON = function (ParsedJSON) {
        this.name = ParsedJSON.name;
        this.dateOfHour = new moment(ParsedJSON.hourDate);
        this.index = ParsedJSON.index;
        this.minutesInHour = ParsedJSON.minutesInHour;

        for (var i = 0; i < ParsedJSON.eventItems.length; i++) {
            this.addEventItem(ParsedJSON.eventItems[i]);
        }
    };
};

//  Generates an EventItem object. USE ONLY WITH 'NEW' VARIABLE INSTANCES!
//      e.g., var myNewEvent = new EventItem(moment(), "myEvent", ...);
function EventItem(eventStartTime, eventName, eventMinutes, eventDescription) {
    this.name = eventName;
    this.minutes = parseInt(eventMinutes);
    this.startTime = eventStartTime;
    this.description = eventDescription;
};

//#endregion

//#region Functions
//  **  Functions

function main() {
    if (!getDay()) {
        initDay(moment());
    }

    renderDay();    
};

//  Retrieve day from local storage
function getDay() {
    var returnValue = false;
    var localData = localStorage.getItem(_LOCALSTORAGE_VARIABLENAME);

    //  We store this data in reduced JSON packages without the functions,
    //      so it requires a bit of unpacking...
    if (localData !== null) {
        var packageArray = JSON.parse(localData);
        _dayHours = [];

        for (var i = 0; i < packageArray.length; i++) {
            let package = packageArray[i];
            let newHour = new HourBlock(moment());
            newHour.fromJSON(package);
            _dayHours.push(newHour);
        };

        returnValue = true;
    };
    return returnValue;
}

//  Load day into local storage
function storeDay() {
    var arrayToStore = []

    //  JSON kind of hates functions, so we're going to pack things up
    //      a bit to make them nicer for it. And smaller.
    for (var i = 0; i < _dayHours.length; i++) {
        let hourToPack = _dayHours[i];
        let package = hourToPack.forJSON();
        arrayToStore.push(package);
    }

    var stringToStore = JSON.stringify(arrayToStore);
    localStorage.setItem(_LOCALSTORAGE_VARIABLENAME, stringToStore);
}

//  **  It'd probably be useful to have a verifyLocalStorage function, too, just in case.
//      That's outside the scope of this project, though, so I'm going to leave it for the future.

//  This sets up HourBlocks for the day from scratch, in case there's nothing in local storage.
function initDay(targetMoment) {
    for (var i = 0; i < _HOURS_INDAY; i++) {
        let newMoment = targetMoment.clone().set({'hour': i, 'minute': 0, 'second': 0});
        let newHour = new HourBlock(newMoment);
        _dayHours.push(newHour);
    };

}

//  Draw the web page with the appropriate events
function renderDay () {
    //  Put the current date at the top of the page.
    var stringDate = _plannerDate.format("dddd, MMMM Do YYYY");
    $("#currentDay").text(stringDate);
        
    //  Get rid of the current HTML
    var divTimeblock = $("#timeblocks");
    divTimeblock.empty();

    //  Generate new HTML with any new events
    for (var i = 0; i < _HOURS_INDAY; i++) {
        var newHour = _dayHours[i]
        newHour.makeBlock();
    };

    //  push the data down to local storage
    storeDay();
};

//  Draw the time form with the appropriate events
function renderTimeForm(parentHourBlock) {
    $("#time-form-events").empty();

    for (var i = 0; i < parentHourBlock.eventItems.length; i++) {
        var currentEvent = parentHourBlock.eventItems[i];
        renderEvent(currentEvent, i);
    };
        
    //  Indicate the hour at the top of the form and prefill the duration input
    $("#slot-name").text(parentHourBlock.name);
    $("#new-event-minutes-input").val(60);
};

//  For the Event Form, creates a new event from the user input.
function addNewEvent () {
    var eventName = $("#new-event-input").val();
    var eventMinutes = $("#new-event-minutes-input").val();
    var eventDescription = $("#new-event-description-input").val();

    if (eventName == "") {
        alert("Event Name field cannot be empty!");
        return;
    } else if (eventMinutes <= 0) {
        alert("Event Duration field must be a positive number!")
        return;
    };

    var currentHourBlock = _dayHours[_currentHourIndex];

    var minutesUsed = currentHourBlock.timeUsed();
    var eventStart = currentHourBlock.dateOfHour.clone().add(minutesUsed, 'minutes');
    
    var newEvent = new EventItem(eventStart, eventName, eventMinutes, eventDescription);

    if (currentHourBlock.addEventItem(newEvent)) {
        renderEvent(newEvent, currentHourBlock.eventItems.length - 1);

        $("#new-event-input").val("");
        $("#new-event-minutes-input").val(60);
        $("#new-event-description-input").val("");
        $("#new-event-input").focus();
    } else {
        alert("Couldn't add that event.");
    };
}

//  Given an event, displays it in the Event Form
function renderEvent(eventToAdd, eventIndex) {
    var divNew = $('<div class="container">');
    var rowLine = $('<div class="row border-0 d-flex-inline">');
    var eventText = $('<span class="col-10">').text(eventToAdd.name);
    var eventButton = $('<span class="col-2 trash-container">').html('<button id="' + eventIndex + '_trash" class="btn trash-button"><i class="fas fa-trash"></i></button>');
        
    rowLine.append(eventText, eventButton);
    divNew.append(rowLine);

    var className = "container time-block event ";
    var relationToPresent = _dayHours[_currentHourIndex].isInThePresent(_MARGINFORPRESENT_INHOURS);
    if (relationToPresent > 0) {
        className += _TIMEBLOCK_CLASS_FUTURE;
    } else if (relationToPresent == 0) {
        className += _TIMEBLOCK_CLASS_PRESENT;
    } else {
        className += _TIMEBLOCK_CLASS_PAST;
    }

    var divEvent = $("#time-form-events");
    
    divNew.addClass(className);
    divNew.attr("id", eventIndex + "_event");

    divEvent.append(divNew);
}

//#endregion

//#region Events

//  **  Events

//  Click on page - Hour block
$(document).on("click", ".hour", function () {
    var blockID = $(this).attr("id");
    var blockIndex = blockID.substring(0, blockID.indexOf("h"));
    _currentHourIndex = parseInt(blockIndex);

    $("#time-form").show();
    renderTimeForm(_dayHours[_currentHourIndex]);
});

//  Click on Event Form - Trash Event icon
$(document).on("click", ".trash-button", function() {
    event.preventDefault();
    _isDeletePressed = true;            //  Just in case the click hits the ".event" handler, too.

    var eventId = $(this).attr("id");
    var eventIndex = parseInt(eventId.substring(0, eventId.indexOf("_")));
    
    var currentHourBlock = _dayHours[_currentHourIndex];
    var eventName = currentHourBlock.eventItems[eventIndex].name;

    if (confirm("Delete '" + eventName + "'. Are you sure?")) {
        currentHourBlock.removeEventItem(eventIndex);
        renderTimeForm(currentHourBlock);
    }
});

//  Click on Event Form - Event block
$(document).on("click", ".event", function () {
    event.preventDefault();
    if (this === undefined) {           //  After trashing events
        return;
    }

    if (!_isDeletePressed) {
        //  To prevent pesky bubbling irregularities.
        var eventId = $(this).attr("id");
        var eventIndex = parseInt(eventId.substring(0, eventId.indexOf("_")));
        var currentEvent = _dayHours[_currentHourIndex].eventItems[eventIndex];

        var msgReport = currentEvent.name + "\n" +
                    "Duration: " + currentEvent.minutes + " minutes\n" +
                    currentEvent.description;
        
        alert(msgReport);
    };
    _isDeletePressed = false;
});

//  Click on Adding a New Event in the Event Form
$("#new-event-button").on("click", function () {
    event.preventDefault();
    _isDeletePressed = false;

    addNewEvent();
});

//  Keydown event inside the New Event fields in the Event Form
$(".new-event-control").on("keydown", function(event) {
    eventKeyCode = event.keyCode;
    _isDeletePressed = false;
    
    if (eventKeyCode == 15) {                   //  Carriage Return
        event.preventDefault();

        addNewEvent();
    };
});

//  Click on Event Form Close button
$("#time-form-close").on("click", function () {
    event.preventDefault();
    _isDeletePressed = false;   

    $("#time-form").hide();
    renderDay();
});

//#endregion

//#region Logic

//  **  Logic

$(document).ready (function() {
    main();
});

//#endregion