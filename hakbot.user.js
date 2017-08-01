// ==UserScript==
// @name        hakbot
// @namespace   rapupdategrind
// @description adds misc features
// @include     https://disqus.com/embed/comments/*
// @version     1
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @grant       unsafeWindow
// ==/UserScript==
// wie lange soll gewartet werden auf die antwort des "neue kommentare buttons"
var waitForNewComments = 5,
// letzten update zeitraum initial niedrig setzen damit beim 1. mal triggert
lastAutoUpdate = Date.now() - (waitForNewComments + 1) * 1000, //set below threshold initially
// wie viele sekunden mindestens warten für jedes like
upvoteEveryNSeconds = 6,
// wie viele sekunden maximal zufällig auf die zeit oben drauf (damit es für disqus organischer wirkt)
upvoteEveryNFuzzy = 3,
// handle für timerout
timeoutHandle,
intervalHandle,
ENABLED = false,
AUTOUPDATE = false,
upvote = function () {
  var upvoteLinks = document.querySelectorAll('a.vote-up:not(.upvoted):not(.upvote-attempted-3)'),
  nextLink = upvoteLinks[0],
  //sowohl "neue antwort" als auch "neue kommentare" buttons berücksichtigen
  loadMoreButton = document.querySelector('.alert.alert--realtime'),
  newCommentsButton = document.querySelector('.realtime-button.reveal:not([style*=none])'),
  now = Date.now(),
  skipUpvote = false,
  infowindows,
  infowindow,
  i;
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
  attachUi();
},
attachUi = function () {
  //toggle button einbauen
  var li = $('<li>').addClass('nav-tab nav-tab--secondary dropdown autogrind pull-right').insertAfter('.dropdown.sorting'),
  label = $('<label>').prop('for','autogrind-toggle').prop('href', '#').text(' AUTOLIKE').appendTo(li).addClass('dropdown-toggle'),
  input = $('<input>').prop('type','checkbox').prop('id','autogrind-toggle').prependTo(label),
      
  liUpdate = $('<li>').addClass('nav-tab nav-tab--secondary dropdown autogrind pull-right').insertAfter('.dropdown.sorting'),
  labelUpdate = $('<label>').prop('for','autoupdate-toggle').prop('href', '#').text(' AUTOUPDATE').appendTo(liUpdate).addClass('dropdown-toggle'),
  inputUpdate = $('<input>').prop('type','checkbox').prop('id','autoupdate-toggle').prependTo(labelUpdate);
  
  $(label).add(labelUpdate).css({
   display: 'block',
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
  
  enqueue();
  
}, patchComments = function(){
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
