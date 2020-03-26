//      *** Day Planner  ***     
//
//      Uses jQuery & moment.js
//

//  **  Declarations

const _HOURS_INDAY = 24;
const _MINUTES_INHOUR = 60;
const _TIMEBLOCK_CLASS = "time-block hour ";
const _TIMEBLOCK_CLASS_PAST = "past";
const _TIMEBLOCK_CLASS_PRESENT = "present";
const _TIMEBLOCK_CLASS_FUTURE = "future";
const _MARGINFORPRESENT_INHOURS = 1;

var _plannerDate = moment();
var _dayHours = [];


//  Generates an HourBlock object. USE ONLY WITH 'NEW' VARIABLE INSTANCES!
//      e.g., var myNewHour = new HourBlock(moment());
function HourBlock(hourDate) {
    this.dateOfHour = hourDate;
    this.index = hourDate.hour();
    this.eventItems = [];
    this.minutesInHour = _MINUTES_INHOUR;
    this.htmlOwner = undefined;

    let hourString = hourDate.hour().toString();
    if (hourString.length == 1) {
        hourString = "0" + hourString;
    }
    this.hourName = hourString + "h00";
    
    this.timeUsed = function(indexToOmit) {
        var totalTime = 0;
        this.eventItems.forEach(function (element, elementIndex) {
            if (elementIndex != indexToOmit) {
                totalTime += element.minutes;
            };
        });
        return totalTime;
    };
    this.timeRemaining = function() {
        var totalTime = this.timeUsed(-1);
        return this.minutesInHour - totalTime;
    };
    this.addEventItem = function(eventItem_ToAdd) {
        var returnValue = false;
        var totalTime = this.timeUsed(-1);
        if (totalTime + eventItem_ToAdd.minutes <= this.minutesInHour) {
            this.eventItems.push(eventItem_ToAdd);
            returnValue = true;
        };
        return returnValue;
    };
    this.setEventItem = function(eventItem_ToAdd, indexOfItem) {
        var returnValue = false;
        var totalTime = this.timeUsed(indexOfItem);        
        if (totalTime + eventItem_ToAdd.minutes <= this.minutesInHour) {
            this.eventItems[indexOfItem] = eventItem_ToAdd;
            returnValue = true;
        }
        return returnValue;
    };
    this.makeBlock = function () {
        var divNew = $("<div>")
        var topLine = $("<p>").text(this.hourName + "\n ");
        var bottomLine = $("<p>").text("--");

        divNew.append(topLine, bottomLine);

        var className = _TIMEBLOCK_CLASS;
        var relationToPresent = this.isInThePresent(_MARGINFORPRESENT_INHOURS);
        if (relationToPresent > 0) {
            className += _TIMEBLOCK_CLASS_FUTURE;
        } else if (relationToPresent == 0) {
            className += _TIMEBLOCK_CLASS_PRESENT;
        } else {
            className += _TIMEBLOCK_CLASS_PAST;
        }

        divNew.addClass(className);
        $("#timeblocks").append(divNew);
    };
    this.isInThePresent = function (hoursMargin) {
        //  Returns -1 for past, 0 for present, 1 for future.
        var returnValue = 0;
        let beforeTime = this.dateOfHour.clone().subtract(hoursMargin, "hours");
        let afterTime = this.dateOfHour.clone().add(hoursMargin, "hours");

        if (moment().isBefore(beforeTime)) {
            returnValue = -1;
        } else if (moment().isAfter(afterTime)) {
            returnValue = 1;
        }

        return returnValue;
    }
};

//  Generates an EventItem object. USE ONLY WITH 'NEW' VARIABLE INSTANCES!
//      e.g., var myNewEvent = new EventItem(moment(), "myEvent", ...);
function EventItem(eventStartTime, eventName, eventMinutes, eventDescription) {
    this.name = eventName;
    this.minutes = eventMinutes;
    this.startTime = eventStartTime;
    this.description = eventDescription;
};


//  **  Functions

function main() {

    renderDay();    

};

function renderDay () {
    var divTimeblock = $("#timeblocks");

    for (var i = 0; i < _HOURS_INDAY; i++) {
        var newMoment = moment().clone().set({'hour': i, 'minute': 0, 'second': 0});
        var newHour = new HourBlock(newMoment);
        newHour.makeBlock();

        _dayHours.push(newHour);
    };

};

//  **  Events



//  **  Logic

$(document).ready (function() {
    main();
});

