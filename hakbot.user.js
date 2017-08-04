// ==UserScript==
// @name        hakbot
// @namespace   rapupdategrind
// @description adds misc features
// @include     https://disqus.com/embed/comments/*
// @version     1
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @grant       unsafeWindow
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==
// wie lange soll gewartet werden auf die antwort des "neue kommentare buttons"
var waitForNewComments = 5,
    newCommentIntervals = [5,20,60,180],
// letzten update zeitraum initial niedrig setzen damit beim 1. mal triggert
lastAutoUpdate = Date.now() - (waitForNewComments + 1) * 1000, //set below threshold initially
// wie viele sekunden mindestens warten für jedes like
upvoteEveryNSeconds = 6,
// wie viele sekunden maximal zufällig auf die zeit oben drauf (damit es für disqus organischer wirkt)
upvoteEveryNFuzzy = 3,
// handle für timerout
timeoutHandle,
intervalHandle,
upvoteThreshold = 0,
upvoteThresholds = [0,1,2,3,5,8,13,21],
namesToFilter, 
ENABLED = false,
AUTOUPDATE = false,
upvote = function () {
  var upvoteLinks = document.querySelectorAll('a.vote-up:not(.upvoted):not(.upvote-attempted-3):not(.ignore)'),
  nextLink,
  //sowohl "neue antwort" als auch "neue kommentare" buttons berücksichtigen
  loadMoreButton = document.querySelector('.alert.alert--realtime'),
  newCommentsButton = document.querySelector('.realtime-button.reveal:not([style*=none])'),
  now = Date.now(),
  skipUpvote = false,
  infowindows,
  infowindow,
  currentCount,
  i, userNode, userName, userDisplayName,
  linkFound = false;
  ignoreListRe = new RegExp( namesToFilter.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&").split(/\s?,\s?/).join('|'), 'i' );


  for( i = 0; nextLink = upvoteLinks[i]; i++){
    userNode = $(nextLink).parents('.post').first().find('.post-byline .author a').first();
    userName = userNode.data('username');
    userDisplayName = userNode.text();

    if(ignoreListRe.test(userDisplayName)){
      $(nextLink).addClass('ignore');
      continue;
    }

    currentCount = parseInt($(nextLink).prop('class').match(/count\-(\d+)/)[1],10);
    
    if(upvoteThreshold > 0 && currentCount < upvoteThreshold){
      continue;
    }

    linkFound = true;
    break;
  }

  if(!linkFound){
    nextLink = false;
  }


  // wenn neue kommentare geladen werden können: laden statte voten damit nicht
  // 2 calls gleichzeitig passieren
  if (AUTOUPDATE && loadMoreButton && now > lastAutoUpdate + waitForNewComments * 1000) {
    loadMoreButton.click();
    lastAutoUpdate = now;
    skipUpvote = true;
  }
  if (AUTOUPDATE && newCommentsButton) {
      newCommentsButton.click();
  }  
  // 3 versuche

  if (ENABLED && !skipUpvote && nextLink) {
    if (nextLink.classList.contains('upvote-attempted-2')) {
      nextLink.classList.add('upvote-attempted-3');
    }
    if (nextLink.classList.contains('upvote-attempted-1')) {
      nextLink.classList.add('upvote-attempted-2');
    } else {
      nextLink.classList.add('upvote-attempted-1');
    }
    nextLink.click();
  }  
  
  //upvote function neu enqueuen

  enqueue();
  $('.tooltip-outer.upvoters-outer').hide();
  patchComments();
  
},
enqueue = function () {

  timeoutHandle = setTimeout(upvote, upvoteEveryNSeconds + (Math.random() * upvoteEveryNFuzzy) * 1000);
},
waitForJQuery = function () {
  // warten bis fertig ist
  if (typeof unsafeWindow.jQuery !== 'function') {
    return;
  }
  if (unsafeWindow.jQuery('.dropdown.sorting').length === 0) {
    return;
  }
  clearInterval(intervalHandle);
  
  namesToFilter = GM_getValue('namefilter','') || '';
  
  attachUi();
},
attachUi = function () {
  //toggle button einbauen
  var li = $('<li>').addClass('nav-tab nav-tab--secondary dropdown autogrind pull-right').insertAfter('.dropdown.sorting'),
  label = $('<label>').prop('for','autogrind-toggle').prop('href', '#').text(' AUTOLIKE').appendTo(li).addClass('dropdown-toggle'),
  input = $('<input>').prop('type','checkbox').prop('id','autogrind-toggle').prependTo(label),
  dropDownLink = $('<a>').css({display:'inline', marginLeft:'15px'}).prop('href','#').attr('data-toggle','dropdown').addClass('dropdown-toggle').html('<span class="caret"></span>').appendTo(li);

  liUpdate = $('<li>').addClass('nav-tab nav-tab--secondary dropdown autoupdate pull-right').insertAfter('.dropdown.sorting'),
  labelUpdate = $('<label>').prop('for','autoupdate-toggle').prop('href', '#').html(' AUTOUPDATE (<i>'+waitForNewComments+'</i>s)').appendTo(liUpdate).addClass('dropdown-toggle'),
  inputUpdate = $('<input>').prop('type','checkbox').prop('id','autoupdate-toggle').prependTo(labelUpdate),
  dropDownLinkUpdate = $('<a>').css({display:'inline', marginLeft:'15px'}).prop('href','#').attr('data-toggle','dropdown').addClass('dropdown-toggle').html('<span class="caret"></span>').appendTo(liUpdate);
  
  $(label).add(labelUpdate).css({
   display: 'inline-block',
   margin: '0 0 0 20px',
   padding: 0,
   fontWeight: 700,
   lineHeight: 1,
   fontSize: '13px',
   color : '#656c7a',
   marginTop : '-2px'
  });
  
  $(input).get()[0].addEventListener('click', function(e){
    ENABLED = $(this).prop('checked');

  }, true);

  $(inputUpdate).get()[0].addEventListener('click', function(e){
    AUTOUPDATE = $(this).prop('checked');

  }, true);
  
  attachUpdateOptions();
  attachGrindOptions();
  
  enqueue();
  
}, attachUpdateOptions = function(){
  var ul = $('<ul>').addClass('dropdown-menu').appendTo('.autoupdate'),
     i, li, input, label, a;
  
  for( i = 0; i < newCommentIntervals.length; i++){
    li = $('<li>').appendTo(ul);
    label = $('<label>').appendTo(li).text(' ' + newCommentIntervals[i] + ' Sekunden').css({
      display: 'block',
      fontWeight: '500',
      lineHeight: '18px',
      padding : '4px 15px'
    });
    input = $('<input>').prop('name','autoupdateinterval').prop('type','radio').val(newCommentIntervals[i]).prependTo(label).prop('checked', i === 0);

    $(input).get()[0].addEventListener('click', function(e){

        waitForNewComments = parseInt($(this).val(), 10);
        $('.autoupdate i').text(waitForNewComments);
    });
  }
},
attachGrindOptions = function(){
  var ul = $('<ul>').addClass('dropdown-menu').appendTo('.autogrind'),
     i, li, input, label, a;

    li = $('<li>').appendTo(ul);
    label = $('<label>').appendTo(li).html('<strong>Upvote nur bei</strong>').css({
      display: 'block',
      fontWeight: '500',
      lineHeight: '18px',
      padding : '4px 15px'      
    });
  
  for( i = 0; i < upvoteThresholds.length; i++){
    li = $('<li>').appendTo(ul);
    label = $('<label>').appendTo(li).text(' min. ' + upvoteThresholds[i] + ' Upvotes').css({
      display: 'block',
      fontWeight: '500',
      lineHeight: '18px',
      padding : '4px 15px',
      whiteSpace: 'nowrap'
    });
    input = $('<input>').prop('name','autoupdateinterval').prop('type','radio').val(upvoteThresholds[i]).prependTo(label).prop('checked', i === 0);

    $(input).get()[0].addEventListener('click', function(e){

        upvoteThreshold = parseInt($(this).val(), 10);
    });
  }

    li = $('<li>').appendTo(ul);
    label = $('<label>').appendTo(li).html('Namensfilter').css({
      display: 'block',
      fontWeight: '500',
      lineHeight: '18px',
      padding : '4px 15px'      
    });

    $(label).get()[0].addEventListener('click', function(e){
        namesToFilter = prompt('Filter (siehe github)',namesToFilter);
        GM_setValue('namefilter', namesToFilter);
    });
},
    patchComments = function(){
 $('.post-message p:not(.patched)').each(function(i,item){
   $(item).html( $(item).html().replace(/((http|https|ftp):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g, '<a target="_blank" href="$1">$1</a> ') )
   .addClass('patched');
   
   $(item).find('a[href*=youtube]').each(function(ii, link){
     var ytid = getYoutubeId($(link).prop('href'));
     if(ytid !== 'error'){
       $(item).html($(item).html() + '<iframe width="560" height="315" src="//www.youtube.com/embed/' + ytid + '" frameborder="0" allowfullscreen></iframe>');
     }

   });
 });
}, getYoutubeId = function(url) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);

    if (match && match[2].length == 11) {
        return match[2];
    } else {
        return 'error';
    }
};

intervalHandle = setInterval(waitForJQuery, 250);
