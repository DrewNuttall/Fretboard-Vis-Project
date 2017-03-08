// JavaScript source code

//#region Globals
var aNames = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
//var aNames = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];
var aTuning = ['E', 'B', 'G', 'D', 'A', 'E'];
var numStrings = 6;
var numFrets = 22;
var neckMargin = 10;    //  distance between top/bottom of fretboard and 1st/last strings
var stringMargin = 30;  //  distance between strings
var fbHeight = 0;       //  height of fretboard
var aNotes = [];        //  holds note objects
var aDegrees = new Array('Root', 'b2 / b9', '2 / 9', 'b3rd / #9', '3rd', '4th', 'b5 / #11', '5th', '#5 / b13', '6 / 13', 'b7th', '7th');
//						    0        1         2           3        4       5      6       7       8          9       10      11
var aColors = new Array('#FF0000', '#FE3300', '#FF5500', '#FFAA00', '#FFFF00', '#008000', '#007777', '#0000FF', '#481AB2', '#4B0082', '#990188', '#EE82EE');
//                          r         r-o         o          o-y        y          y-g         g         g-b        b           b-i        i        v
var aSteps = []; //	steps (numeric values) for ea tone of the current scale or chord
var aScales = []; //	arr of 'known scale' objects containing name, desc, modeOf and a nested arr of steps
var oScale = null;
var aChords = [];   //  array of chord objs from chords.json file
var aOpts = []; //	arr of suggested scale objs from analyzeChord()
var svgNS = "http://www.w3.org/2000/svg";
var bSuperimpose = false;   //  indicates that we are superimposing one tonality over another (so don't clear the notesLayer)
var bUserNotesExist = false;    //  indicates that the user is adding notes manually - ask before clearing the userLayer
var root = '';      //  this is used to hold the value of the roots dropdown on superimpose

//#endregion
function start()
{
    adjust();
    getScales();
    getChords();
    try
    {
        //  assume a C Major Chord to get started:
        $$('types').value = 'chord';
        //buildTonalities(); find();
        setTimeout(buildTonalities, 500);
        //setTimeout(find, 500);
    } catch (e)
    {
        alert('An error has occurred while the page was loading:\n\n' + e.message);
    } finally
    {
        drawFretboard();
        setTimeout(find,1000);
    }
}
//#region View Model
function drawFretboard()
{
    $$('baseLayer').innerHTML = "";     //  clear
    fbHeight = neckMargin + ((numStrings - 1) * stringMargin) + neckMargin;
    $$('fretboard').setAttributeNS(null, "height", (fbHeight + 20));
    // fbBackground:
    var o = document.createElementNS(svgNS, "rect");
    o.setAttributeNS(null, "id", "fbBackground");
    o.setAttributeNS(null, "x", "10");
    o.setAttributeNS(null, "y", "0");
    o.setAttributeNS(null, "width", "1070");
    o.setAttributeNS(null, "height", (fbHeight - 2));
    o.setAttributeNS(null, "fill", "url(#wood)");
    //stroke="black" stroke-opacity="0" fill-opacity="1"></rect>
    $$('baseLayer').appendChild(o);

    //-- draw the nut:
    var o = document.createElementNS(svgNS, "rect");
    o.setAttributeNS(null, "id", "nut");
    o.setAttributeNS(null, "x", "0");
    o.setAttributeNS(null, "y", "0");
    o.setAttributeNS(null, "width", "10");
    o.setAttributeNS(null, "height", fbHeight);
    o.setAttributeNS(null, "fill", "gray");
    o.setAttributeNS(null, "stroke", "black");
    $$('baseLayer').appendChild(o);

    //-- top of

    var o = document.createElementNS(svgNS, "rect");
    o.setAttributeNS(null, "id", "fbTop");
    o.setAttributeNS(null, "x1", "0");
    o.setAttributeNS(null, "y1", "0");
    o.setAttributeNS(null, "x2", "1080");
    o.setAttributeNS(null, "y2", "0");
    o.setAttributeNS(null, "stroke", "black;");
    o.setAttributeNS(null, "stroke-width", "5");
    $$('baseLayer').appendChild(o);

    //-- bottom of fretboard
    var o = document.createElementNS(svgNS, "line");
    o.setAttributeNS(null, "id", "fbBottom");
    o.setAttributeNS(null, "x1", "0");
    o.setAttributeNS(null, "y1", fbHeight);
    o.setAttributeNS(null, "x2", "1080");
    o.setAttributeNS(null, "y2", fbHeight);
    o.setAttributeNS(null, "stroke", "black");
    o.setAttributeNS(null, "stroke-width", "5");
    $$('baseLayer').appendChild(o);

    //  ====================              draw frets
    var x = 90; //  width of nut (10) + margin (80)
    var offset = 3; //  num pixel to decrease width of next higher
    var margin = 80;
    for (var i = 0; i < numFrets; i++)
    {
        var fret = document.createElementNS(svgNS, "line");
        fret.setAttributeNS(null, 'id', 'f' + i);
        fret.setAttributeNS(null, 'stroke', 'silver');
        fret.setAttributeNS(null, 'stroke-width', '1');
        fret.setAttributeNS(null, "fill", "silver");
        fret.setAttributeNS(null, 'x1', x);
        fret.setAttributeNS(null, 'x2', x);
        fret.setAttributeNS(null, 'y1', '0');
        fret.setAttributeNS(null, 'y2', fbHeight);
        $$("baseLayer").appendChild(fret);
        x += (margin -= offset);
        if (x === 0)
        {
            x -= 10; //  after the 1st fret is drawn, remove the width of the nut
        }
    }

    //  =====================              draw the fret markers and number the frets

    var prevX = 10; // this is the x coord of the 'previous' fret, initialized to the end of the nut
    var y = fbHeight / 2;
    for (var i = 0; i < numFrets; i++)
    {
        var x = $$('f' + i).x1.baseVal.value;
        var newX = ((x - prevX) / 2) + prevX;
        drawFretNumber(newX, i);
        if (i === 2 || i === 4 || i === 6 || i === 8 || i === 14 || i === 16 || i === 18 || i === 20)
        {
            drawMarker(newX, y);
        }
        if (i === 11)
        {
            drawMarkerII(newX);
        }
        prevX = x; // reset to current x's value for next iteration
    }

    //  ===================                  draw the strings

    margin = 30; //  distance between strings
    var y = 10; //  1st string y coord
    var aW = ['0.75', '1', '1.25', '1.5', '1.75', '2'];
    for (var i = 0; i < numStrings; i++)
    {
        var string = document.createElementNS(svgNS, "line");
        string.setAttributeNS(null, 'id', 's' + i);
        string.setAttributeNS(null, 'stroke', 'peru');
        string.setAttributeNS(null, 'stroke-width', aW[i]);
        string.setAttributeNS(null, "fill", "black");
        string.setAttributeNS(null, 'x1', 1);
        string.setAttributeNS(null, 'x2', 1080);
        string.setAttributeNS(null, 'y1', y);
        string.setAttributeNS(null, 'y2', y);
        $$("baseLayer").appendChild(string);
                
        if ($$('instruments').value === 'mandolin')
        {
            var string = document.createElementNS(svgNS, "line");
            string.setAttributeNS(null, 'stroke', 'peru');
            string.setAttributeNS(null, 'stroke-width', '.50');
            string.setAttributeNS(null, "fill", "black");
            string.setAttributeNS(null, 'x1', 1);
            string.setAttributeNS(null, 'x2', 1080);
            string.setAttributeNS(null, 'y1', (y-3));
            string.setAttributeNS(null, 'y2', (y-3));
            $$("baseLayer").appendChild(string);
        }
        y += margin;
    }
}

//  =======================          Draw Note
function drawNote(o)
{
    var note = document.createElementNS(svgNS, "circle");
    //note.setAttributeNS(null, "id", "mycircle");
    note.setAttributeNS(null, "cx", o.x);
    note.setAttributeNS(null, "cy", o.y);
    note.setAttributeNS(null, "r", o.r);

    if (o.c === '#FF0000') //  if this is the root/tonic, we want the center to be white so shrink the stroke a bit
    {
        note.setAttributeNS(null, "stroke", o.c);
        note.setAttributeNS(null, "fill", "white");
        note.setAttributeNS(null, "stroke-width", 6);
    } else
    {
        note.setAttributeNS(null, "stroke", o.w);
        note.setAttributeNS(null, "fill", o.c);
    }
    if (bSuperimpose)
    {
        note.setAttributeNS(null, "stroke", "black");
        note.setAttributeNS(null, "stroke-width", 2);
        //note.setAttributeNS(null, "r", 4);
    }
    //note.setAttributeNS(null, "fill-opacity","0.2");
    note.setAttributeNS(null, "stroke-opacity", "0.5");
    $$("notesLayer").appendChild(note);

    //  now put a text node on top with the note name in it
    var data = document.createTextNode(o.n);
    var text = document.createElementNS(svgNS, "text");
    text.setAttributeNS(null, "x", o.x);
    text.setAttributeNS(null, "y", (o.y + 3)); // align vertical
    text.setAttributeNS(null, "text-anchor", "middle");
    text.setAttributeNS(null, "font-weight", "normal");
    text.setAttributeNS(null, "font-size", "8px");
    text.appendChild(data);
    text.setAttributeNS(null, "fill", getContrast(o.c));
    $$("notesLayer").appendChild(text);
}

function drawNoteMarker(o)
{
    // this group will be the parent to a user-clicked note:
    var g = document.createElementNS(svgNS,"g");
    g.setAttributeNS(null, "id", "nm" + (aNotes.length - 1).toString());
    g.setAttributeNS(null, "name", o.n);
    g.setAttributeNS(null, "style","visibility:hidden");
    g.setAttributeNS(null, "fill-opacity", "0.0");
    g.setAttributeNS(null, "stroke-opacity", "0.5");
    g.setAttributeNS(null, "onmouseover", "show(this)");
    g.setAttributeNS(null, "onmouseout", "hide(this)");
    g.setAttributeNS(null, "onclick", "noteClick(this)");
    g.setAttributeNS(null, "fill", "black");
    g.setAttributeNS(null, "stroke", "white");
    g.setAttribute('state', 'off');
    // the circle
    var note = document.createElementNS(svgNS, "circle");
    note.setAttributeNS(null, "id", "nmc" + (aNotes.length-1).toString());
    note.setAttributeNS(null, "cx", o.x);
    note.setAttributeNS(null, "cy", o.y);
    note.setAttributeNS(null, "r", 8);
    note.setAttributeNS(null, "pointer-events", "all");
    g.appendChild(note);
    //  now put a text node on top with the note name in it
    var data = document.createTextNode(o.n);
    //data.style = "cursor:none";       //  note: this has no effect.  see fretboard.html style section of the svg element
    var text = document.createElementNS(svgNS, "text");
    note.setAttributeNS(null, "id", "nmt" + (aNotes.length - 1).toString());
    text.setAttributeNS(null, "x", o.x);
    text.setAttributeNS(null, "y", (o.y + 3)); // align vertical
    text.setAttributeNS(null, "text-anchor", "middle");
    text.setAttributeNS(null, "style","font-size:8");
    text.setAttributeNS(null, "stroke", "none");
    text.setAttributeNS(null, "fill", "white");
    text.appendChild(data);
    text.textContent = o.n;
    text.setAttributeNS(null, "pointer-event", "none");
    g.appendChild(text);

    //  now add a title node for hint on onmouseover
    var data = document.createTextNode("Click to Show/Hide this note.");
    var title = document.createElementNS(svgNS, "title");
    title.appendChild(data);
    title.setAttributeNS(null, "fill", 'white');
    g.appendChild(title);
    $$("userLayer").appendChild(g);
}

function noteClick(o)
{
    var state = o.getAttribute('state');
    switch (state) {
    case "off":
        o.style.visibility = 'visible';
        o.setAttribute('state', 'on');
        o.setAttributeNS(null, "fill-opacity", "1");
        //o.setAttributeNS(null, "fill", "red");  //(this is set in show function now)
        o.setAttributeNS(null, "stroke", "white");
        break;
    case "on":
        bUserNotesExist = true;
        o.style.visibility = 'hidden';
        o.setAttribute('state', 'off');
        o.setAttributeNS(null, "fill-opacity", "1");
        o.setAttributeNS(null, "fill", "black");
        o.setAttributeNS(null, "stroke", "white");
        break;
    default:
    }
    propogate(o);
}

function show(o)
{
    if (o.getAttribute('state') == "on")
    {
        return;
    }
    o.style.visibility = 'visible';
    o.setAttributeNS(null, "fill-opacity", "1");
    o.setAttributeNS(null, "stroke-opacity", "1");
    setAttributes(o);
    propogate(o);
}

function hide(o)
{
    if (o.getAttribute('state') == "on")
    {
        return;
    }
    o.style.visibility = 'hidden';
    o.setAttributeNS(null, "fill-opacity", "0.0");
    o.setAttributeNS(null, "stroke-opacity", "0.0");
    propogate(o);
}

function setAttributes(o)   //  takes a note marker group from the user layer (o) and finds the notes relationship to the root and sets attribs accordingly (color, etc.)
{
    var root = $$('roots').value;
    if (!root)
    {
        return;
    }
    var aAll = aNames; //  the note names
    //  set the aAll array to begin with root:
    do
    {
        aAll.unshift(aAll.pop());
    } while (aAll[0] !== root)
    var name = o.getAttribute("name");
    for (var i in aAll)
    {
        if (aAll[i] === name)
        {
            o.setAttributeNS(null, 'fill', aColors[i]);
            var o2 = o.childNodes[1];
            o2.setAttributeNS(null, 'fill', getContrast(aColors[i]));
            var o3 = o.childNodes[2];
            o3.innerHTML = aDegrees[i] + ' of ' + root + ' - Click to Show/Hide this note.';
            break;
        }
    }
}
//  take the state of noteMarker object (model) and copies the key attributes to noteMarkers all over the fretboard with the same name (note)
function propogate(model)
{
    var root = $$('roots').value;
    var aNodes = $$('userLayer').childNodes;
    //  store the key attributes of the model in vars so that we don't hit the DOM for them on every iteration:
    var name = model.getAttribute("name");
    var color = model.getAttribute("fill");
    var vis = model.getAttribute("visibility");
    var fOpac = model.getAttributeNS(null, "fill-opacity");
    var sOpac = model.getAttributeNS(null, "stroke-opacity");
    var title = model.childNodes[2].innerHTML;
    for (var i = 0; i < aNodes.length; i++)
    {
        var o = aNodes[i];
        if (o.getAttribute("name") === name)
        {
            o.setAttributeNS(null, "fill", color);
            o.style.visibility = vis;
            o.setAttributeNS(null, "fill-opacity", fOpac);
            o.setAttributeNS(null, "stroke-opacity", sOpac);
            var o2 = o.childNodes[1];
            o2.setAttributeNS(null, "fill", getContrast(color));
            var o3 = o.childNodes[2];
            o3.innerHTML = title;
        }
    }
}

function getContrast(hexcolor)
{
    return (hexcolor === '#FF0000' || hexcolor === '#FFFF00') ? 'black' : 'white';
    //return (parseInt(hexcolor, 16) > 0xffffff / 2) ? 'black' : 'white';
}

function clearNotes()
{
    $$('notesLayer').innerHTML = '';
    if (bUserNotesExist)
    {
        if (confirm('Clear Notes you have generated as well as the current tonality?'))
        {
            $$('userLayer').innerHTML = '';
            createNotes();
        }
    }
    $$('degreesArea').innerHTML = '';
    $$('degreesArea').style.display = 'none';
    $$('analyzeResult').innerHTML = '';
    $$('analyzeResult').style.display = 'none';
    $$('descArea').innerHTML = 'Please select Chord or Scale';
    $$('roots').selectedIndex = -1;
    $$('tonalities').selectedIndex = -1;
    bSuperimpose = false;
}

function clearAll()
{
    $$('notesLayer').innerHTML = '';
    $$('userLayer').innerHTML = '';
    $$('degreesArea').innerHTML = '';
    $$('degreesArea').style.display = 'none';
    $$('analyzeResult').innerHTML = '';
    $$('analyzeResult').style.display = 'none';
    $$('descArea').innerHTML = 'Please select Chord or Scale';
}

function adjust()
{
    $$('fretboard').setAttribute('viewBox', $$('r1').value + ' ' + r2.value + ' ' + r3.value + ' ' + r4.value);
    $$('fretboard').setAttribute('height', $$('r5').value);
    $$('fretboard').setAttribute('width', $$('r6').value);
    $$('viewArea').value = $$('fretboard').viewBox.animVal.x + ' ' +
                            $$('fretboard').viewBox.animVal.y + ' ' +
                            $$('fretboard').viewBox.animVal.width + ' ' +
                            $$('fretboard').viewBox.animVal.height;
    $$('r1o').value = $$('r1').value;
    $$('r2o').value = $$('r2').value;
    $$('r3o').value = $$('r3').value;
    $$('r4o').value = $$('r4').value;
    $$('r5o').value = $$('r5').value;
    $$('r6o').value = $$('r6').value;
}

function autoAdjust()
{
    var a = [];
    switch ($$("views").value)
    {
        case "n":
            if (numStrings === 6)
            {
                a.push(0, 0, 1080, 190, 170, 1080);
            } else if (numStrings === 4)
            {
                a.push(0, -70, 1200, 190, 170, 1080);
            }
        case "z1":
            if (numStrings === 6)
            {
                a.push(0, 0, 377, 170, 330, 660);
            } else if (numStrings === 4)
            {
                a.push(0, 0, 387, 51, 408, 817);
            }

        case "z2":
            if (numStrings === 6)
            {
                a.push(11, -3, 248, 182, 349, 525);
            } else if (numStrings === 4)
            {
                a.push(0, -20, 329, 127, 263, 578);
            }
        default:
            if (numStrings === 6)
            {
                a.push(0, 0, 1080, 190, 170, 1080);
            } else if (numStrings === 4)
            {
                a.push(0, -70, 1200, 190, 170, 1080);
            }
    }

    $$('r2').value = a[1];
    $$('r3').value = a[2];
    $$('r4').value = a[3];
    $$('r5').value = a[4];
    $$('r6').value = a[5];
    adjust();
}

// draw a particular note everywhere we find its name on the fretboard:
//  n = name, c = color, b = bool (if true, make the note smaller)
function drawTonality(n, c, b)
{
    for (var i in aNotes)
    {
        if (aNotes[i].n === n)
        {
            aNotes[i].c = c;
            if (b)
            {
                aNotes[i].r = 6;
            }
            drawNote(aNotes[i]);
        }
    }
}

function drawFretNumber(x, n)
{
    n++;
    var data = document.createTextNode(n);
    var num = document.createElementNS(svgNS, "text");
    num.setAttributeNS(null, "x", x);
    num.setAttributeNS(null, "y", fbHeight + 7);
    num.setAttributeNS(null, "text-anchor", "middle");
    num.setAttributeNS(null, "font-weight", "normal");
    num.setAttributeNS(null, "font-size", "8px");
    num.setAttributeNS(null, "fill", "white");
    num.appendChild(data);
    $$("baseLayer").appendChild(num);
}

function drawMarker(x, y)
{
    //    var marker = document.createElementNS(svgNS, "polygon");
    //    marker.setAttributeNS(null, "points="newX,0 5,5 0,10" style="fill:lime;stroke:purple;stroke-width:1" />
    var marker = document.createElementNS(svgNS, "ellipse");
    marker.setAttributeNS(null, "cx", x);
    marker.setAttributeNS(null, "cy", y);
    marker.setAttributeNS(null, "rx", 4);
    marker.setAttributeNS(null, "ry", 2);
    marker.setAttributeNS(null, "fill", "url(#grad1)");
    //marker.setAttributeNS(null, "fill", "White");
    //marker.setAttributeNS(null, "stroke", "White");
    //marker.setAttributeNS(null, "fill-opacity", "0.4");
    //marker.setAttributeNS(null, "stroke-opacity", "0.4");
    $$("baseLayer").appendChild(marker);
}

function drawMarkerII(x)
{
    var marker = document.createElementNS(svgNS, "ellipse");
    marker.setAttributeNS(null, "cx", x);
    marker.setAttributeNS(null, "cy", (fbHeight / 2) - stringMargin);
    marker.setAttributeNS(null, "rx", 4);
    marker.setAttributeNS(null, "ry", 2);
    marker.setAttributeNS(null, "fill", "url(#grad1)");
    //marker.setAttributeNS(null, "fill", "White");
    //marker.setAttributeNS(null, "stroke", "White");
    //marker.setAttributeNS(null, "fill-opacity", "0.4");
    //marker.setAttributeNS(null, "stroke-opacity", "0.4");
    $$("baseLayer").appendChild(marker);

    var marker = document.createElementNS(svgNS, "ellipse");
    marker.setAttributeNS(null, "cx", x);
    marker.setAttributeNS(null, "cy", (fbHeight / 2) + stringMargin);
    marker.setAttributeNS(null, "rx", 4);
    marker.setAttributeNS(null, "ry", 2);
    marker.setAttributeNS(null, "fill", "url(#grad1)");
    //marker.setAttributeNS(null, "fill", "White");
    //marker.setAttributeNS(null, "stroke", "White");
    //marker.setAttributeNS(null, "fill-opacity", "0.4");
    //marker.setAttributeNS(null, "stroke-opacity", "0.4");
    $$("baseLayer").appendChild(marker);
}

function changeViewStyle()
{
    if ($$('viewstyles').value === "ebony")
    {
        $$('woodImage').setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', "http://drewnuttall.com/ebony.jpg");
        $$("fbBackground").setAttribute("fill", "url(#wood)");
    } else if ($$('viewstyles').value === "rosewood")
    {
        $$('woodImage').setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', "http://drewnuttall.com/rosewood.jpg");
        $$("fbBackground").setAttribute("fill", "url(#wood)");
    } else if ($$('viewstyles').value === 'simple')
    {
        $$("fbBackground").setAttribute('fill', "black");
    }
}

function changeTuning()
{
    var s = $$('tunings').value;
    switch (s)
    {
        case 'standard':
            aTuning = ['E', 'B', 'G', 'D', 'A', 'E'];
            break;
        case 'dropD':
            aTuning = ['E', 'B', 'G', 'D', 'A', 'D'];
            break;
        case 'openG':
            aTuning = ['D', 'B', 'G', 'D', 'G', 'D'];
            break;
        case 'openE':
            aTuning = ['E', 'B', 'G#', 'E', 'B', 'E'];
            break;
        case 'dadgad':
            aTuning = ['D', 'A', 'G', 'D', 'A', 'D'];
            break;
        default:
            aTuning = ['E', 'B', 'G', 'D', 'A', 'E'];
    }
    find();
}

function changeInstrument()
{
    var s = $$('instruments').value;
    switch (s)
    {
        case 'guitar':
            aTuning = ['E', 'B', 'G', 'D', 'A', 'E'];
            $$('tunings').disabled = false;
            break;
        case 'mandolin':
            aTuning = ['E', 'A', 'D', 'G'];
            $$('tunings').disabled = true;
            //fbBackground.setAttribute("height", 110);
            //fretboard.setAttribute("height",110);
            //fbBottom.setAttribute("y1",110);
            //fbBottom.setAttribute("y2",110);
            break;
        case 'uke':
            aTuning = ['A', 'E', 'C', 'G'];
            $$('tunings').disabled = true;
            break;
        case 'banjo':
            aTuning = ['D', 'B', 'G', 'D', 'G'];
            $$('tunings').disabled = true;
            break;
        default:
            aTuning = ['E', 'B', 'G', 'D', 'A', 'E'];
            $$('tunings').disabled = false;
    }
    numStrings = aTuning.length;

    drawFretboard();
    autoAdjust();
    find();
}

function panLeft()
{
    var v = $$('r1').value;
    $$('r1').value = parseInt(v) - 30;
    adjust();
}

function panRight()
{
    var v = $$('r1').value;
    $$('r1').value = parseInt(v) + 30;
    adjust();
}



//#endregion

//#region Data / Resources
//  ========================================================================================================
//  Build Tonalities
//  ========================================================================================================
function buildTonalities()
{
    if ($$('types').value === 'chord')
    {
        var html = '<select id="tonalities" onchange="find();" title="Click to Select the Chord Type to display">';
        var bGroup = false;
        var member = '';
        var a = aChords;
        for (var i in a)
        {
            if (a[i].memberOf !== member && bGroup) //	end group if there is one and the current/next item does not belong to the group
            {
                html += '</optgroup>';
                bGroup = false;
            }
            if (a[i].memberOf !== '' && !bGroup) //	start a group if there is one and it is not in progress
            {
                html += '<optgroup label="' + a[i].memberOf + '">';
                member = a[i].memberOf;
                bGroup = true;
            }
            html += '<option value="' + a[i].name + '">' + a[i].name;
        }
        html += '</select>';
        $$('tonalArea').innerHTML = html;
        $$('tonalities').selectedIndex = 0; //  when we switch from chord to scale, select Ionian Mode so that default notes are drawn
    } else
    {
        var html = '';
        html += '<select id="tonalities"  onchange="find();" title="Click to Select the Scale you would like to display">';
        var bGroup = false;
        var mode = '';
        var a = aScales;
        for (var i in a)
        {
            if (a[i].modeOf !== mode && bGroup) //	end group if there is one and the current/next item does not belong to the group
            {
                html += '</optgroup>';
                bGroup = false;
            }
            if (a[i].modeOf !== '' && !bGroup) //	start a group if there is one and it is not in progress
            {
                html += '<optgroup label="' + a[i].modeOf + '">';
                mode = a[i].modeOf;
                bGroup = true;
            }
            html += '<option value="' + a[i].name + '">' + a[i].desc;
        }
        html += '</select>';
        $$('tonalArea').innerHTML = html;
        $$('tonalities').selectedIndex = 0; //  when we switch from chord to scale, select Ionian Mode so that default notes are drawn
    }
    //$$('tonalities').size = 12;
    $$('analyzeResult').style.display = 'none';
}

//  ========================================================================================================
//          Define Scales
//  ========================================================================================================
/*     getting error in Chrome with this.  URGH!*/
function getScales()
{
    var xmlhttp = new XMLHttpRequest();
    //var url = "http://www.drewnuttall.com/scales.json";
    var url = "scales.json";

    xmlhttp.onreadystatechange = function ()
    {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
        {
            aScales = JSON.parse(xmlhttp.responseText);
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

function getChords()
{
    var xmlhttp = new XMLHttpRequest();
    var url = 'chords.json';
    xmlhttp.onreadystatechange = function ()
    {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
        {
            aChords = JSON.parse(xmlhttp.responseText);
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

/*
aScales.push(
    { name: 'ionian', 'fx': 'I', 'desc': 'I Ionian', 'modeOf': 'Major', 'aSteps': [0, 2, 4, 5, 7, 9, 11] }, //	major
    { name: 'dorian', 'fx': 'ii', 'desc': 'ii Dorian', 'modeOf': 'Major', 'aSteps': [0, 2, 3, 5, 7, 9, 10] },
    { name: 'phrygian', 'fx': 'iii', 'desc': 'iii Phrygian', 'modeOf': 'Major', 'aSteps': [0, 1, 3, 5, 7, 8, 10] },
    { name: 'lydian', 'fx': 'IV', 'desc': 'IV Lydian', 'modeOf': 'Major', 'aSteps': [0, 2, 4, 6, 7, 9, 11] },
    { name: 'mixolydian', 'fx': 'V', 'desc': 'V Mixolydian', 'modeOf': 'Major', 'aSteps': [0, 2, 4, 5, 7, 9, 10] },
    { name: 'aeolian', 'fx': 'vi', 'desc': 'vi Aeolian', 'modeOf': 'Major', 'aSteps': [0, 2, 3, 5, 7, 8, 10] },
    { name: 'locrian', 'fx': 'vii-', 'desc': 'vii&deg; Locrian', 'modeOf': 'Major', 'aSteps': [0, 1, 3, 5, 6, 8, 10] },
    { name: 'aeolian', 'fx': 'i', 'desc': 'i Aeolian', 'modeOf': 'Minor', 'aSteps': [0, 2, 3, 5, 7, 8, 10] }, //	minor
    { name: 'locrian', 'fx': 'ii', 'desc': 'ii&deg; Locrian', 'modeOf': 'Minor', 'aSteps': [0, 1, 3, 5, 6, 8, 10] },
    { name: 'ionian', 'fx': 'III', 'desc': 'III Ionian', 'modeOf': 'Minor', 'aSteps': [0, 2, 4, 5, 7, 9, 11] },
    { name: 'dorian', 'fx': 'iv', 'desc': 'iv Dorian', 'modeOf': 'Minor', 'aSteps': [0, 2, 3, 5, 7, 9, 10] },
    { name: 'phrygian', 'fx': 'v', 'desc': 'v Phrygian', 'modeOf': 'Minor', 'aSteps': [0, 1, 3, 5, 7, 8, 10] },
    { name: 'lydian', 'fx': 'VI', 'desc': 'VI Lydian', 'modeOf': 'Minor', 'aSteps': [0, 2, 4, 6, 7, 9, 11] },
    { name: 'mixolydian', 'fx': 'VII', 'desc': 'VII Mixolydian', 'modeOf': 'Minor', 'aSteps': [0, 2, 4, 5, 7, 9, 10] },
    { name: 'Melodic Minor', 'fx': 'i', 'desc': 'i Melodic Minor', 'modeOf': 'Melodic Minor', 'aSteps': [0, 2, 3, 5, 7, 9, 11] }, //	melodic minor
    { name: 'Dorian b2', 'fx': 'ii', 'desc': 'ii Dorian b2', 'modeOf': 'Melodic Minor', 'aSteps': [0, 1, 3, 5, 7, 9, 10] },
    { name: 'Lydian #5', 'fx': 'III', 'desc': 'III Lydian #5', 'modeOf': 'Melodic Minor', 'aSteps': [0, 2, 4, 6, 8, 9, 11] },
    { name: 'Lydian Dominant', 'fx': 'IV', 'desc': 'IV Lydian Dominant', 'modeOf': 'Melodic Minor', 'aSteps': [0, 2, 4, 6, 7, 9, 10] },
    { name: 'Mixolydian b6', 'fx': 'V', 'desc': 'V Mixolydian b6', 'modeOf': 'Melodic Minor', 'aSteps': [0, 2, 4, 5, 7, 8, 10] },
    { name: 'locrian #2', 'fx': 'vi-', 'desc': 'vi&deg; Locrian #2', 'modeOf': 'Melodic Minor', 'aSteps': [0, 2, 3, 5, 6, 8, 10] },
    { name: 'altered', 'fx': 'vii', 'desc': 'vii&deg; Altered', 'modeOf': 'Melodic Minor', 'aSteps': [0, 1, 3, 4, 6, 8, 10] },
    { name: 'Harmonic Minor', 'fx': 'i', 'desc': 'i Aeolian #7', 'modeOf': 'Harmonic Minor', 'aSteps': [0, 2, 3, 5, 7, 8, 11] }, //	harmonic minor
    { name: 'locrian 6', 'fx': 'ii-', 'desc': 'ii&deg; Locrian #6', 'modeOf': 'Harmonic Minor', 'aSteps': [0, 1, 3, 5, 6, 9, 10] },
    { name: 'ionian #5', 'fx': 'III', 'desc': 'III Ionian #5', 'modeOf': 'Harmonic Minor', 'aSteps': [0, 2, 4, 5, 8, 9, 11] },
    { name: 'dorian #4', 'fx': 'iv', 'desc': 'iv Dorian #4', 'modeOf': 'Harmonic Minor', 'aSteps': [0, 2, 3, 6, 7, 9, 10] },
    { name: 'phrygian major', 'fx': 'V', 'desc': 'V Phrygian Major', 'modeOf': 'Harmonic Minor', 'aSteps': [0, 1, 4, 5, 7, 8, 10] },
    { name: 'lydian #2', 'fx': 'VI', 'desc': 'VI Lydian #2', 'modeOf': 'Harmonic Minor', 'aSteps': [0, 3, 4, 6, 7, 9, 11] },
    { name: 'mixolydian #1', 'fx': 'vii-', 'desc': 'vii&deg; Mixolydian #1', 'modeOf': 'Harmonic Minor', 'aSteps': [1, 2, 4, 5, 7, 9, 10] },
    { name: 'dimH', 'fx': '', 'desc': 'Diminished (half-whole)', 'modeOf': 'Diminished', 'aSteps': [0, 1, 3, 4, 6, 7, 9, 10] }, //	diminished
    { name: 'dimW', 'fx': '', 'desc': 'Diminished (whole-half)', 'modeOf': 'Diminished', 'aSteps': [0, 2, 3, 5, 6, 8, 9, 11] },
    { name: 'aug', 'fx': '', 'desc': 'Augmented', 'modeOf': 'Augmented', 'aSteps': [0, 3, 4, 7, 8, 11] }, //	augmented
    { name: 'augI', 'fx': '', 'desc': 'Augmented Inverse', 'modeOf': 'Augmented', 'aSteps': [0, 1, 4, 5, 8, 9] },
    { name: 'whole', 'fx': '', 'desc': 'Whole Tone', 'modeOf': '', 'aSteps': [0, 2, 4, 6, 8, 10] },
    { name: 'Major Pentatonic', 'fx': '', 'desc': 'Major Pentatonic', 'modeOf': '', 'aSteps': [0, 2, 4, 7, 9] },
    { name: 'Minor Pentatonic', 'fx': '', 'desc': 'Minor Pentatonic', 'modeOf': '', 'aSteps': [0, 3, 5, 7, 10] },
    { name: 'blues', 'fx': '', 'desc': 'Blues', 'modeOf': '', 'aSteps': [0, 3, 5, 6, 7, 10] }, // blues
    { name: 'Major Pentatonic b7', 'fx': '', 'desc': 'Major Penatatonic b7', 'modeOf': '', 'aSteps': [0, 2, 4, 7, 10] }, // major pent b7
    { name: 'Minor Pentatonic 6', 'fx': '', 'desc': 'Minor Penatatonic 6', 'modeOf': '', 'aSteps': [0, 3, 5, 7, 9] }, // 
    { name: 'Harmonic Major', 'fx': '', 'desc': 'Harmonic Major', 'modeOf': '', 'aSteps': [0, 2, 4, 5, 7, 8, 11] }
);*/

//#endregion

//#region Business Logic
function incNames(n) //  since the aNames arr is only 12 items, we need to restart it when the pointer gets to 11
{
    if (n != 0 && n % 11 == 0)
    {
        n = 0;
    } else
    {
        n++;
    }
    return n;
}

function locateName(n) // returns the correct pointer within the aNames arr for starting note of the current string
{
    var target = aTuning[n];
    for (var i = 0; i < aNames.length; i++)
    {
        if (aNames[i] === target)
        {
            return i;
        }
    }
    return null;
}

function note()
{
    return {
        'x': 0, //  xCoord
        'y': 0, //  yCoord
        'r': 8, //  radius
        'c': 'black', //  color
        'n': '', //  name
        'w': 2 //  strokeWidth
    };
}

function createNotes()
{
    //  ========================================================================================================
    // create note objs
    //  ========================================================================================================
    aNotes = [];    //  clear
    var z = 0;  //  using this to keep a pointer to the aNotes arr and send it to drawNoteMarker so we can add an ID
    for (var i = 0; i < numStrings; i++)
    {
        var y = $$('s' + i).y1.baseVal.value;
        var prevX = 10; // this is the x coord of the 'previous' fret, initialized to the end of the nut
        var n = locateName(i); //  this is the pointer to name of note on the open string from the aTuning arr
        // create the open string (or zero fret) note:
        var o = new note();
        o.x = 5;
        o.y = y;
        o.r = 4;
        o.n = aNames[n];
        aNotes.push(o);
        drawNoteMarker(o)
        n = incNames(n);
        // now create the notes for each fret on this string
        for (var j = 0; j < numFrets; j++)
        {
            var x = $$('f' + j).x1.baseVal.value;
            var o = new note();
            o.x = ((x - prevX) / 2) + prevX;
            o.y = y;
            o.n = aNames[n];
            aNotes.push(o);
            drawNoteMarker(o);
            prevX = x; // reset to current x's value for next iteration
            n = incNames(n);
        }
    }
}
function find()
{
    //alert(arguments.callee.caller.toString());
    if (!bSuperimpose)
    {
        clearAll();
        createNotes();
    }
    getTonality();
}

function superimpose()
{
    bSuperimpose = true;
    aParentSteps = aSteps;
    $$('tonalities').selectedIndex = -1;
    $$('descArea').innerHTML = 'To <b>Superimpose</b> another tonality, please select the Scale/Mode or Chord and then click "Display".';
}

//  ========================================================================================================
//          Analyze Chord
//  ========================================================================================================
function analyzeChord()
{
    aOpts = []; //	reset scale options
    var s = 'Scale Options for ' + $$('roots').value + " " + $$('tonalities').value + ':<br/>';

    for (var i in aScales) //	loop through all known scales
    {
        var aMatched = [];
        for (var j in aSteps) //	loop through current chords tones
        {
            var bMatch = true;
            var a = aScales[i].aSteps; // these are the current scale's tones
            for (var k in a)
            {
                if (aSteps[j] === a[k])
                {
                    aMatched.push(a[k]); //	add this matched step to the aMatch arr
                    break; //	we have a match - stop looking for this chord tone
                }
            }
        }
        if (aMatched.length === aSteps.length) //	if the arr of matched tones is the same length as the array of chord tones, all the tones have been found in the current scale.
        {
            aOpts.push(aScales[i]); //	add it to the suggested scales array
        }
    }

    if (aOpts.length > 0)
    {
        for (var i in aOpts)
        {
            var s2 = '';
            if (aOpts[i].modeOf === '')
            {
                s2 += aOpts[i].desc;
            } else
            {
                s2 = aOpts[i].desc + ' (Mode ' + aOpts[i].fx + ' of ' + aOpts[i].modeOf + ')';
            }            
            s += '<a onclick="$$(\'types\').value = \'scale\';$$(\'types\').onchange();$$(\'tonalities\').value = \'' + aOpts[i].name + '\';find();" href="#" title="Click to Display this Scale.">' + s2 + '</a><br/>';
        }
    } else
    {
        s += '(none)';
    }
    $$('analyzeResult').innerHTML = s;
    $$('analyzeResult').style.display = 'inline-block';
}

//  here we read the form and gather the information about what to display
function getTonality()
{
    //  start building the Degrees table
    var html = '<table style="display:inline-table;">';
    html += '<caption style="font-weight:normal;font-style:italic">Degrees:</caption>';

    if (!$$('types').value || !$$('roots').value)
    {
        return;
    }
    //  start writing the Description of the Chord/Scale
    var desc = "Displaying Notes of the " + $$('roots').value + ' ';
    //  get the steps (members) of the chord or scale and store them in the aSteps arr
    if ($$('types').value === 'scale')
    {
        getScale(); //  populate aSteps and oScale
    } else if ($$('types').value === 'chord')
    {
        getChord(); //  populate aSteps
    }
    var aAll = aNames; //  the note names
    
    
    root = $$('roots').value; // this is resetting the global var "root" to a new value
    

    //  set the aAll array to begin with root:
    do
    {
        aAll.unshift(aAll.pop());
    } while (aAll[0] !== root)

    var aScale = []; //	clear
    // now inspect the tonality and make some decisions about how to display it (larger notes for pentatonic, etc)
    // =================================================================================
    // this is the main loop for going through each degree of the chord or scale, defining its parameters and then drawing the note all over the fretboard
    //  ================================================================================
    var bPentatonic = false;
    for (var i in aSteps)
    {
        aScale.push(aAll[aSteps[i]]);
        var className = aColors[aSteps[i]],
            bSmall = false;
        /*
                        aSteps(root,2nd,3rd,4th,5th,6th,7th)
                                    0     1    2    3   4     5   6
        */
        //		var aDegrees = new Array('Root','b2nd','2nd','b3rd','3rd','4th','b5th','5th','b6th','6th','b7th','7th');
        //				        					     0     1          2     3      4     5      6       7      8      9      10     11
        if ($$('types').value === 'scale')
        {
            //	if the scale has 7 degrees, try to determine a Pentatonic version

            ////////////////////////////////////////////////
            //  TO DO: make anything with an altered 5 use that tone
            ////////////////////////////////////////////////
            if (aSteps.length == 7)
            {
                var bMinor = false;
                var bDom = false;
                if (oScale.fx.match('i') || oScale.fx.match('v'))
                {
                    bMinor = true;
                }
                if (aSteps[6] === 10) // dominant - make the 7th part of the pentatonic instead of the 6th
                {
                    bDom = true;
                }
                if (bDom)
                {
                    if (i == 5)
                    {
                        bSmall = true;
                    }
                } else
                {
                    if (i == 6) //	non-dominant - the 7th is non-pentatonic
                    {
                        bSmall = true;
                    }
                }
                if (bMinor)
                {
                    if (i == 1)
                    {
                        bSmall = true;
                    }
                } else
                {
                    if (i == 3) //	4th non-pentatonic (always?)
                    {
                        bSmall = true;
                    }
                }
            }
        }
        if (bSmall)
        {
            bPentatonic = true;
        }
        html += '<tr valign="middle"><td>' + aAll[aSteps[i]] + '</td><td width="38px" height="25">' + draw(aColors[aSteps[i]], bSmall) + '</td><td>' + aDegrees[aSteps[i]] + '</td></tr>';
        //  now that we know how all the notes for this degree should look, go ahead and draw all of them:
        drawTonality(aAll[aSteps[i]], className, bSmall);
    }
    //  finish the description and the degrees table and write them to the dom:
    if ($$('types').value === 'scale')
    {
        var o = aScales[$$('tonalities').selectedIndex];
        desc += o.desc + ' ' + $$('types').value + '.';
        if (o.fx)
        {
            desc += ' This is the ' + o.fx + ' Mode of the ' + o.modeOf + ' scale.';
        }
        if (bPentatonic)
        {
            desc += '<span class="hint">Larger notes are the "Pentatonic" notes for this tonality.</span>';
        }
    } else
    {
        desc += $$('tonalities').value + ' ' + $$('types').value + '.';
        //desc += '<span class="hint"> Hint:  Click "Analyze" to find Scales which work over this Chord.</span>';
    }
    $$('descArea').innerHTML = desc;
    if (bSuperimpose)
    {
        $$('degreesArea').innerHTML += html;
    } else
    {
        $$('degreesArea').innerHTML = html;
    }
    $$('degreesArea').style.display = 'inline';

    function draw(color, bSmall) // this is (simplified) drawing of the notes in the degree table
    {
        var s = '<svg height="30" width="30">';
        if (bSmall)
        {
            s += '<circle cx="15" cy="11" r="6" fill="' + color + '"/>';
        } else
        {
            if (color === '#FF0000')
            {
                s += '<circle cx="15" cy="11" r="8" fill="white" stroke-width="6" stroke="' + color + '" stroke-opacity="0.5"/>';
            } else
            {
                s += '<circle cx="15" cy="11" r="8" fill="' + color + '"/>';
            }
        }
        s += '</svg>';
        return s;
    }
}

function getChord()
{
    for (var i in aChords)
    {
        if($$('tonalities').value === aChords[i].name)
        {
            aSteps = aChords[i].aSteps;
        }
    }
    return;
    if ($$('tonalities').value === 'Major')
    {
        aSteps = new Array(0, 4, 7);
    }
    if ($$('tonalities').value === 'Minor')
    {
        aSteps = new Array(0, 3, 7);
    }
    if ($$('tonalities').value === 'dim')
    {
        aSteps = new Array(0, 3, 6);
    }
    if ($$('tonalities').value === 'sus2')
    {
        aSteps = [0, 2, 7];
    }
    if ($$('tonalities').value === 'sus4')
    {
        aSteps = [0, 5, 7];
    }
    if ($$('tonalities').value === 'aug')
    {
        aSteps = new Array(0, 4, 8);
    }
    if ($$('tonalities').value === '6')
    {
        aSteps = new Array(0, 4, 7, 9);
    }
    if ($$('tonalities').value === 'm6')
    {
        aSteps = new Array(0, 3, 7, 9);
    }
    if ($$('tonalities').value === '7')
    {
        aSteps = new Array(0, 4, 7, 10);
    }
    if ($$('tonalities').value === 'm7')
    {
        aSteps = new Array(0, 3, 7, 10);
    }
    if ($$('tonalities').value === 'm7b5')
    {
        aSteps = new Array(0, 3, 6, 10);
    }
    if ($$('tonalities').value === 'dim7')
    {
        aSteps = new Array(0, 3, 6, 9);
    }
    if ($$('tonalities').value === 'mmaj7')
    {
        aSteps = new Array(0, 3, 7, 11);
    }
    if ($$('tonalities').value === 'mmaj9')
    {
        aSteps = new Array(0, 3, 7, 2, 11);
    }
    if ($$('tonalities').value === 'maj7')
    {
        aSteps = new Array(0, 4, 7, 11);
    }
    if ($$('tonalities').value === 'maj9')
    {
        aSteps = new Array(0, 4, 7, 2, 11);
    }
    if ($$('tonalities').value === 'maj11')
    {
        aSteps = new Array(0, 4, 7, 9, 2, 11);
    }
    if ($$('tonalities').value === 'm9')
    {
        aSteps = new Array(0, 3, 7, 10, 2);
    }
    if ($$('tonalities').value === '9')
    {
        aSteps = new Array(0, 4, 7, 10, 2);
    }
    if ($$('tonalities').value === '11')
    {
        aSteps = new Array(0, 5, 10, 2);
    }
    if ($$('tonalities').value === '7sus4')
    {
        aSteps = new Array(0, 5, 7, 10);
    }
    if ($$('tonalities').value === 'add9')
    {
        aSteps = new Array(0, 4, 7, 2);
    }
    if ($$('tonalities').value === '13')
    {
        aSteps = new Array(0, 4, 7, 9, 10);
    }
    if ($$('tonalities').value === '6add9')
    {
        aSteps = new Array(0, 4, 7, 9, 2);
    }
    if ($$('tonalities').value === '-5')
    {
        aSteps = new Array(0, 4, 6);
    }
    if ($$('tonalities').value === '7b5')
    {
        aSteps = new Array(0, 4, 6, 10);
    }
    if ($$('tonalities').value === '7+5')
    {
        aSteps = new Array(0, 4, 8, 10);
    }
    if ($$('tonalities').value === '7b9')
    {
        aSteps = new Array(0, 4, 7, 10, 1);
    }
    if ($$('tonalities').value === '7#9')
    {
        aSteps = new Array(0, 4, 7, 10, 3);
    }
    if ($$('tonalities').value === '7b5b9')
    {
        aSteps = new Array(0, 4, 6, 10, 1);
    }
    if ($$('tonalities').value === '7#5b9')
    {
        aSteps = new Array(0, 4, 8, 10, 1);
    }
    if ($$('tonalities').value === '7#5#9')
    {
        aSteps = new Array(0, 4, 8, 10, 3);
    }
    if ($$('tonalities').value === '9b5')
    {
        aSteps = new Array(0, 4, 6, 10, 2);
    }
    if ($$('tonalities').value === '9#5')
    {
        aSteps = new Array(0, 4, 8, 10, 2);
    }
    if ($$('tonalities').value === '13#9')
    {
        aSteps = new Array(0, 4, 7, 9, 10, 3);
    }
    if ($$('tonalities').value === '13b9')
    {
        aSteps = new Array(0, 4, 7, 9, 10, 1);
    }
    //		var aDegrees = new Array('Root','b2nd','2nd','b3rd','3rd','4th','b5th','5th','b6th','6th','b7th','7th');
    //				     		     0     1          2     3      4     5    6      7      8      9      10     11
}

function getScale()
{
    for (var i in aScales)
    {
        if ($$('tonalities').value === aScales[i].name)
        {
            oScale = aScales[i];
            aSteps = aScales[i].aSteps;
        }
    }
}

//#endregion

//#region DOM Related Stuff
function $$(id)
{
    var a = null;
    if (document.all)
    {
        a = document.all;
    } else
    {
        a = document.getElementsByTagName('*');
    }
    if (a)
    {
        return a[id];
    } else
    {
        alert('Object not returned: ' + id);
    }
}

function menuNav()
{
    var e = event;
    var oTrigger = e.srcElement;
    var a = document.querySelectorAll('.menu ul li a');
    var n = null;
    for (var i = 0; i < a.length; i++)
    {
        a[i].className = "";
        if (a[i] == oTrigger)
        {
            n = i;
        }
    }
    a[n].className = "activeTab";
    var a = document.querySelectorAll('.menuTarget');
    for (var i = 0; i < a.length; i++)
    {
        a[i].style.display = 'none';
    }
    a[n].style.display = 'inline';
}
//#endregion
