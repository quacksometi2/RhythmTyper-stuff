var beatmapList = [];
/*
artistName: 
audioFile:
backgroundFiles:
bpm:
description:
difficulties: 
explicit:
hasCustomHitsounds:
language:
mapper:
mapsetId:
offset:
previewTime: 
songName: 
tags: 
timingPoints: 
videoFile:
videoStartTime:
*/
var difficultyList = [];
/*
bgFile:
diffId:
mapsetId:
name:
notes: 
overallDifficulty: 
typingSections: 
(IN BEATMAP DIFF LIST ONLY) starRating:
*/
/*
note tap

hitsound: 
key:
time:
type: "tap"

note hold

endTime: 
hitsound: 
key:
startTime:
type: "hold"
*/
/*
type section

endTime:
startTime:
text:
*/

document.getElementById("zipInput").addEventListener("change", async (event) => {
  const files = [...event.target.files].filter(f => f.name.endsWith(".rtm"));
  if (!files) return;
  for (const file of files)
  {

    const zip = await JSZip.loadAsync(file);

    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        if (!filename.includes(".json"))
          continue;
        const content = await zipEntry.async("string");
        const data = JSON.parse(content);
        const keys = Object.keys(data);
        let hasKey = false;
        for (const key of keys)
        {
          if (key.includes("diffId"))
          {
            hasKey = true;
            break;
          }          
        }
        if (hasKey)
        {
          difficultyList.push(data);
        }
        else
        {
          beatmapList.push(data);
        }
      }
    }        
  }
  const table = document.getElementById("diffList");  
  let tableText = "";
  tableText += "<tr>";
  tableText += "<th>Map</th>";
  tableText += "<th>Difficulty</th>";
  tableText += "<th>BPM</th>";
  tableText += "<th>DrainTime</th>";
  tableText += "<th>NoteCount</th>";
  tableText += "<th>TSCount</th>";
  tableText += "<th>OldStar</th>";
  tableText += "<th>NewStar</th>";
  tableText += "<th>NewStar (NC/DT)</th>";
  tableText += "<th>NewStar (DC/HT)</th>";
  //tableText += "<th>Star without ts bonus</th>";
  tableText += "</tr>";

  for (const difficulty of difficultyList)
  {
    tableText += "<tr>";
    let currentSr = -1;
    let mapSongName = "";
    let mapBpm = 0;
    for (const beatmap of beatmapList)
    {
      if (beatmap.mapsetId == difficulty.mapsetId)
      {
        mapSongName = beatmap.songName;
        mapBpm = Math.round(beatmap.bpm);
        for (const beatmapDiff of beatmap.difficulties)
        {
          if (beatmapDiff.diffId == difficulty.diffId)
          {
            if (beatmapDiff.starRating != null)
              currentSr = beatmapDiff.starRating;
            break;
          }
        }
        break;
      }      
    }
    tableText += "<td>"+ mapSongName +"</td>";
    tableText += "<td>"+ difficulty.name +"</td>";
    tableText += "<td>"+ mapBpm +"</td>";
    let minTime = -1;
    let maxTime = 0;
    for (const note of difficulty.notes)
    {
      if (note.type == "tap")
      {
        if (minTime == -1)
        {
          minTime = note.time;
        }
        if (minTime > note.time)
        {
          minTime = note.time;
        }
        if (maxTime < note.time)
        {
          maxTime = note.time;
        }
      }
      else if (note.type == "hold")
      {
        if (minTime == -1)
        {
          minTime = note.startTime;          
        }
        if (minTime > note.startTime)
        {
          minTime = note.startTime;
        }
        if (maxTime < note.endTime)
        {
          maxTime = note.endTime;
        }
      }
    }
    for (const typingSection of difficulty.typingSections)
    {
      if (minTime == -1)
      {
        minTime = typingSection.startTime;
      }
      if (minTime > typingSection.startTime)
      {
        minTime = typingSection.startTime;
      }
      if (maxTime < typingSection.endTime)
      {
        maxTime = typingSection.endTime;
      }
    }
    let drainTime = maxTime - minTime;
    let drainTimeAllSecond = Math.round(drainTime / 1000); 
    let drainTimeSecond = drainTimeAllSecond % 60;
    if (drainTimeSecond < 10)
      drainTimeSecond = "0"+drainTimeSecond;
    let drainTimeMinute = (drainTimeAllSecond - drainTimeSecond) / 60;
    if (drainTimeMinute < 10)
      drainTimeMinute = "0"+drainTimeMinute;
    
    tableText += "<td>"+drainTimeMinute+":"+ drainTimeSecond +"</td>";
    tableText += "<td>" + difficulty.notes.length + "</td>";
    tableText += "<td>" + difficulty.typingSections.length + "</td>";
    //let star = starFormulas["originalCalculate"](difficulty);
    let difficultyHT = {notes: [], typingSections: []};
    let difficultyDT = {notes: [], typingSections: []};
    for (let i = 0; i < difficulty.notes.length; ++i)
    {
      if (difficulty.notes[i].type == "tap")
      {
        let tempNoteHT = {type: "", time: 0};
        tempNoteHT.type = difficulty.notes[i].type;
        difficultyHT.notes.push(tempNoteHT);
        let tempNoteDT = {type: "", time: 0};
        tempNoteDT.type = difficulty.notes[i].type;
        difficultyDT.notes.push(tempNoteDT);
        difficultyHT.notes[i].time = difficulty.notes[i].time / 0.75;
        difficultyDT.notes[i].time = difficulty.notes[i].time / 1.5;
      }
      else
      {
        let tempNoteHT = {type: "", startTime: 0, endTime: 0};
        tempNoteHT.type = difficulty.notes[i].type;
        difficultyHT.notes.push(tempNoteHT);
        let tempNoteDT = {type: "", startTime: 0, endTime: 0};
        tempNoteDT.type = difficulty.notes[i].type;
        difficultyDT.notes.push(tempNoteDT);
        difficultyHT.notes[i].startTime = difficulty.notes[i].startTime / 0.75;
        difficultyHT.notes[i].endTime = difficulty.notes[i].endTime / 0.75;
        difficultyDT.notes[i].startTime = difficulty.notes[i].startTime / 1.5;
        difficultyDT.notes[i].endTime = difficulty.notes[i].endTime / 1.5;
      }
      
    }
    for (let i = 0; i < difficulty.typingSections.length; ++i)
    {
      let tempTypingSectionHT = {text: "", startTime: 0, endTime: 0};
      tempTypingSectionHT.text = difficulty.typingSections[i].text;
      difficultyHT.typingSections.push(tempTypingSectionHT);
      let tempTypingSectionDT = {text: "", startTime: 0, endTime: 0};
      tempTypingSectionDT.text = difficulty.typingSections[i].text;
      difficultyDT.typingSections.push(tempTypingSectionDT);
      difficultyHT.typingSections[i].startTime = difficulty.typingSections[i].startTime / 0.75;
      difficultyHT.typingSections[i].endTime = difficulty.typingSections[i].endTime / 0.75;
      difficultyDT.typingSections[i].startTime = difficulty.typingSections[i].startTime / 1.5;
      difficultyDT.typingSections[i].endTime = difficulty.typingSections[i].endTime / 1.5;
      
    }
    //let star = starFormulas["originalCalculate"](difficultySeconds);
    let star = starFormulas["valerusRework"](difficulty);
    star = Math.round(star * 100) / 100
    let starHT = starFormulas["valerusRework"](difficultyHT);
    starHT = Math.round(starHT * 100) / 100
    let starDT = starFormulas["valerusRework"](difficultyDT);
    starDT = Math.round(starDT * 100) / 100
    console.log(difficulty);
    console.log(difficultyDT);
    console.log(difficultyHT);
    
    if (currentSr == -1)
    {
      if (diffSrId.includes(difficulty.diffId))
      {
        currentSr = diffSrValues[diffSrId.indexOf(difficulty.diffId)];
      }
      else
      {
        console.log(difficulty.diffId + " "+ mapSongName + " " + difficulty.name)
      }
    }
    tableText += "<td>"+ currentSr +"</td>";
    let colorR = 0;
    let colorG = 0;
    let colorB = 0;
    if (currentSr > star)
    {
      let changeSize = Math.min(currentSr/star, 2) / 2;
      colorG = Math.round(0 + 250*changeSize);
    }
    else if (currentSr < star)
    {
      let changeSize = Math.min(star/currentSr, 2) / 2;
      colorR = Math.round(0 + 250*changeSize);
    }
    tableText += "<td style=\"color:rgb("+colorR+","+colorG+","+colorB+");\">"+ star +"</td>";
    tableText += "<td>" + starDT + "</td>";
    tableText += "<td>" + starHT + "</td>";
    difficulty.accuracy = 100;
    //let pp = ppFormulas["originalCalculate"](difficulty);
    //pp = Math.round(pp);
    //tableText += "<td>"+ pp +"</td>";
    //tableText += "<td>NaN</td>";
    //let starwo = starFormulas["valerusReworkWoTS"](difficulty);
    //starwo = Math.round(starwo * 100) / 100
    //if (starwo == star)
    //{
    //  tableText += "<td>"+ starwo +" (unchanged)</td>";
    //}
    //else
    //{
    //  tableText += "<td>"+ starwo +"</td>";
    //}
    
    tableText += "</tr>";
  }
  table.innerHTML = tableText;
});