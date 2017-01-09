'use strict'
var ParmSet = {
  hatena_id:null,
  api_key:null
}

var ServerAddress = 'https://hatenablog.wackwack.net/hatena_blog';

var showMessage = function(message) {
  var $error_message = $('.irasutoya-search-message');
  $error_message.css('display','block');
  $error_message.text(message);
}

var displayItem = function(jqXHR) {
  var response = JSON.parse(jqXHR.responseText);
  var images = response['images'];
  if(images.length > 0) {
    var $curation_result_items = $('.irasutoya-search-items');
    for(var i=0; i < images.length; i++) {
      var $curation_result_item = $('<div class="item"></div>');
      $curation_result_item.css({
        "background-image": "url(" + images[i]['thumbnail'] + ")",
      });
      $curation_result_item.attr('url',images[i]['url']);
      $curation_result_item.attr('title',images[i]['title']);
      $curation_result_item.on('click',function(){
        var selected_flg = $(this).hasClass('selected');
        var $current_selected = $('.irasutoya-search-items > .selected');
        if($current_selected.length > 0) {
          $current_selected.removeClass('selected');
        }
        if(!selected_flg) {
          $(this).addClass('selected');
          $('.irasutoya-search-paste-button').removeClass('disabled');
          $('.irasutoya-search-paste-button').addClass('enabled');
        } else {
          $('.irasutoya-search-paste-button').removeClass('enabled');
          $('.irasutoya-search-paste-button').addClass('disabled');
        }

      });
      $curation_result_items.append($curation_result_item);
    }

    var next_page = response['next'];
    if (next_page != undefined) {
      var $pager = $('<a href="javascript:void(0);">さらに検索</a>'); 
      $pager.on('click',{_url:next_page},searchIrasutoyaNext);

      var $pager_indicator = $('<div class="indicator"><img src="/images/loading.gif"></img></div>');

      var $irasutoya_pager = $('<div class="item" id="irasutoya-pager"></div>');
      $irasutoya_pager.append($pager);
      $irasutoya_pager.append($pager_indicator);
      $curation_result_items.append($irasutoya_pager);
    }
  } else {
    $('.irasutoya-search-items > .result-empty-message').css('display','block');
  }
}
var searchIrasutoyaNext = function(event) {
  $('.irasutoya-search-message').css('display','none');
  $('#irasutoya-pager > a').hide();
  $('#irasutoya-pager > .indicator').show();
  var url = event.data._url;
  $.ajax({
    method: 'POST',
    url: ServerAddress + '/irasutoya_search',
    data: {url: url},
    dataType: 'json'
  }).done(function(data,textStatus,jqXHR) {
    $('#irasutoya-pager').remove();
    displayItem(jqXHR);
  }).fail(function(jqXHR,textStatus,errorThrown){
    $('#irasutoya-pager > .indicator').hide();
    $('#irasutoya-pager > a').show();
    console.log(textStatus);
    var message = 'エラーが発生しました。しばらく経ってから実行するか、開発者にお問い合わせください。';
    showMessage(message);
  });
}

var searchIrasutoya = function() {
  var query = $('input.irasutoya-search-keyword').val();
  if (!query.match(/\S/g)) {
    return 0;
  }

  $('.irasutoya-search-items > .indicator').css('display','block');
  $('.irasutoya-search-items > .result-empty-message').css('display','none');
  $('.irasutoya-search-message').css('display','none');
  $('.irasutoya-search-items > .item').remove();

  var $paste_button = $('.irasutoya-search-paste-button');
  if($paste_button.hasClass('enabled')) {
    $paste_button.removeClass('enabled');
    $paste_button.addClass('disabled');
  }

  $.ajax({
      method: 'POST',
      url: ServerAddress + '/irasutoya_search',
      data: {query: query},
      dataType: 'json'
  }).done(function(data,textStatus,jqXHR) {
    displayItem(jqXHR);
  }).fail(function(jqXHR,textStatus,errorThrown){
    console.log(textStatus);
    var message = 'エラーが発生しました。しばらく経ってから実行するか、開発者にお問い合わせください。';
    showMessage(message);
  }).always(function(){
    $('.irasutoya-search-items > .indicator').css('display','none');
  });
}

var pasteIrasutoya = function() {
  chrome.storage.local.get(['HatenaIrasutoya_HatenaId','HatenaIrasutoya_ApiKey'],function(value){
    ParmSet.hatena_id = value.HatenaIrasutoya_HatenaId;
    ParmSet.api_key = value.HatenaIrasutoya_ApiKey;

    $('.irasutoya-search-message').css('display','none');
    $('.fotolife-indicator').css('display','block');

    var selected_item = $('.irasutoya-search-items > .selected');
    var url = selected_item.attr('url');
    var title = selected_item.attr('title');
    $.ajax({
      method: 'POST',
      url: ServerAddress + '/irasutoya_upload',
      data: {title: title,url: url,id: ParmSet.hatena_id, api_key: ParmSet.api_key},
      dataType: 'json'
    }).done(function(data,textStatus,jqXHR) {
      var $paste_button = $('.irasutoya-search-paste-button');
      $paste_button.removeClass('enabled');
      $paste_button.addClass('disabled');

      var selected_item = $('.irasutoya-search-items > .selected');
      selected_item.removeClass('selected');

      var response = JSON.parse(jqXHR.responseText);
      var syntax = response['syntax'];
      var fotolife_descriptor = syntax.replace(':image',':plain');

      $('#body').val($('#body').val() + "[" +  fotolife_descriptor + "]");
      $('.js-folder-selector').change();
    }).fail(function(jqXHR,textStatus,errorThrown){
      console.log(textStatus);
      var message = '';
      switch(jqXHR.status) {
        case 403:
          message = 'フォトライフのアップロードに失敗しました。はてなidとAPIキーの設定を確認して下さい。';
          break;  
        default:
          message = 'エラーが発生しました。しばらく経ってから実行するか、開発者にお問い合わせください。';
          break;
      }
      showMessage(message);
    }).always(function(){
      $('.fotolife-indicator').css('display','none');
    });
  });
}
$(document).ready(function(){
  var $irasutoya_link = $('<a href="javascript:void(0);">いらすとやで探す</a>');
  $irasutoya_link.on('click',function(){
    $('#editor-fotolife').css('display','none');
    $('#editor-irasutoya').css('display','block');
  });
  $('<div class="irasutoya-notice"></div>').append($irasutoya_link).insertAfter($('#uploader-wrapper > h2'));

  var $curation_tab = $('<div id="editor-irasutoya" class="editor-irasutoya curation-tab-content">');

  var $curation_content = $('<div class="editor-irasutoya-content"></div>');

  var $fotolife_link = $('<a href="javascript:void(0);">写真投稿に戻る</a>');
  $fotolife_link.on('click',function(){
    $('#editor-irasutoya').css('display','none');
    $('#editor-fotolife').css('display','block');
  });
  
  var $curation_header = $('<div class="irasutoya-header curation-header curation-tab-content-inner"></div>');
  var $curation_header_title = $('<h2>いらすとや検索</h2>');
  var $curation_header_keyword = $('<div class="irasutoya-search-keyword-wrapper sidebar-search-form"></div>');
  var $curation_header_keyword_input = $('<input type="text" placeholder="キーワードを入力" class="irasutoya-search-keyword sidebar-search-form__input" data-ignore-click-jacking="1" size="30"></input>');
  $curation_header_keyword_input.on('keydown',function(event){
    if(event.keyCode == 13) {
      searchIrasutoya();
    }
  });

  var $curation_header_keyword_button = $('<button type="button" class="irasutoya-search-keyword-submit sidebar-search-form__submit"><i class="blogicon-search"></i></button>');
  $curation_header_keyword_button.on('click',searchIrasutoya);

  $curation_header_keyword.append($curation_header_keyword_input);
  $curation_header_keyword.append($curation_header_keyword_button);
  $curation_header.append($curation_header_title);
  $curation_header.append($('<div class="fotolife-return-notice"></div>').append($fotolife_link));
  $curation_header.append($curation_header_keyword);


  var $curation_result = $('<div class="irasutoya-search-result"></div>');
  var $curation_result_items = $('<div class="irasutoya-search-items items vertical-items overthrow"><div>');
  var $curation_result_indicator = $('<div class="indicator"><img src="/images/loading.gif">検索中...</img></div>');
  var $curation_result_empty = $('<div class="result-empty-message irasutoya-search-result-is-empty">お探しのイラストは見つかりませんでした。</div>');
  $curation_result_items.append($curation_result_indicator);
  $curation_result_items.append($curation_result_empty);
  $curation_result.append($curation_result_items);

  var $curation_footer = $('<div class="irasutoya-search-footer curation-footer curation-tab-content-inner"></div>');
  var $curation_footer_container = $('<div class="irasutoya-search-paste-button-container"></div>');
  var $curation_footer_container_button = $('<button class="irasutoya-search-paste-button disabled btn paste-button" type="button" data-track-name="curation-irasutoya-search-paste-button">選択したイラストを貼り付け</button>'); 
  $curation_footer_container_button.on('click',pasteIrasutoya);
  $curation_footer_container.append($curation_footer_container_button);
  $curation_footer.append($curation_footer_container);

  var $curation_upload_indicator = $('<div class="indicator fotolife-indicator"><img src="/images/loading.gif">フォトライフへアップロード中...</img></div>');
  var $curation_message = $('<div class="irasutoya-search-message"></div>');

  $curation_content.append($curation_header);
  $curation_content.append($curation_upload_indicator);
  $curation_content.append($curation_message);
  $curation_content.append($curation_result);
  $curation_content.append($curation_footer);

  $curation_tab.append($curation_content);

  $curation_tab.insertAfter($('div.curation-tab-content:last-child'));

});
