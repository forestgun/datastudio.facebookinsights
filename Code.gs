var cc = DataStudioApp.createCommunityConnector();

function getConfig() {
  var config = cc.getConfig();

  config.newInfo()
      .setId('instructions')
  .setText('Please enter the configuration data for your Facebook connector');

  config.newTextInput()
      .setId('page_id')
      .setName('Enter your Facebook Page Id')
      .setHelpText('Find the page Id on the \'About\' section of your page')  
      .setPlaceholder('Enter Facebook Page Id here')
      .setAllowOverride(false);
  
  config.setDateRangeRequired(true);

  return config.build();
}

  /*
  ------------------------------------------------------
  DataStudio fields
  ------------------------------------------------------
  */

function getFields() {
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;  
  
  fields.newMetric()
      .setId('pageLikes')
      .setName('Total Likes')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('pageImpressionsTotal')
      .setName('Total Impressions')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('pageImpressionsOrganic')
      .setName('Organic Impressions')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('pageImpressionsPaid')
      .setName('Paid Impressions')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  
  fields.newMetric()
      .setId('pageImpressionsViral')
      .setName('Viral Impressions')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
    
  return fields;
}


function getSchema(request) {  
    var fields = getFields().build();
    return { 'schema': fields };    
}

function getData(request) {  
  
  
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  
  var outputData = {};
  
  // Perform data request per field
  request.fields.forEach(function(field) {
    
    if (field.name == 'pageLikes') {
      outputData.page_likes = graphData(request, "insights/page_fans?fields=values");
    }
    if (field.name == 'pageImpressionsTotal') {
      outputData.page_impressions_total = graphData(request, "insights/page_impressions/day?fields=values");
    }
    if (field.name == 'pageImpressionsOrganic') {
      outputData.page_impressions_organic = graphData(request, "insights/page_impressions_organic/day?fields=values");
    }
    if (field.name == 'pageImpressionsPaid') {
      outputData.page_impressions_paid = graphData(request, "insights/page_impressions_paid/day?fields=values");
    }
    if (field.name == 'pageImpressionsViral') {
      outputData.page_impressions_viral = graphData(request, "insights/page_impressions_viral/day?fields=values");
    }
  });
  
  var requestedFields = getFields().forIds(requestedFieldIds);
  
  if(typeof outputData !== 'undefined')
  {    
    rows = reportToRows(requestedFields, outputData);
    // TODO: parseData.paging.next != undefined
  } else {
    rows = [];
  }
  
  result = {
    schema: requestedFields.build(),
    rows: rows
  };  
  
  //cache.put(request_hash, JSON.stringify(result));
  return result;  
}

function reportPageLikes(report) {
  var rows = [];
    
  // Only report last number of page likes within date range
  var row = {};
  var valueRows = report['data'][0]['values'][0];
  row["pageLikes"] = report['data'][0]['values'][0][valueRows.length-1]['value'];
  rows[0] = row;
  
  return rows;
  
}

// Report all daily reports to rows 
function reportDaily(report, type) {
  var rows = [];
  
  var valueRows = report['data'][0]['values'][0];
  
  // Loop report
  for (var i = 0; i < valueRows.length; i++) {
    var row = {};
    
    row[type] = report['data'][0]['values'][0][i]['value'];
    
    // Assign all data to rows list
    rows.push(row);
  }
  
  return rows;
}

function reportToRows(requestedFields, report) {
  var rows = [];
  var data = [];  
  
  if (typeof report.page_likes !== 'undefined') {
    data = data.concat(reportPageLikes(report.page_likes));
  }
  if (typeof report.page_impressions_total !== 'undefined') {
    data = reportDaily(report.page_impressions_total, 'pageImpressionsTotal');
  }  
  if (typeof report.page_impressions_organic !== 'undefined') {
    data = reportDaily(report.page_impressions_organic, 'pageImpressionsOrganic');
  }
  if (typeof report.page_impressions_paid !== 'undefined') {
    data = reportDaily(report.page_impressions_paid, 'pageImpressionsPaid');
  }  
  if (typeof report.page_impressions_viral !== 'undefined') {
    data = reportDaily(report.page_impressions_viral, 'pageImpressionsViral');
  }  
    
  // Merge data
  for(var i = 0; i < data.length; i++) {
    row = [];    
    requestedFields.asArray().forEach(function (field) {
  
         switch (field.getId()) {
           case 'pageLikes':
              return row.push(data[i]["pageLikes"]);
           case 'pageImpressionsOrganic':
             return row.push(data[i]["pageImpressionsOrganic"]);
           case 'pageImpressionsPaid':
             return row.push(data[i]["pageImpressionsPaid"]);
           case 'pageImpressionsViral':
             return row.push(data[i]["pageImpressionsViral"]);
           case 'pageImpressionsTotal':
             return row.push(data[i]["pageImpressionsTotal"]);
             break;
         }
      
    });
    if (row.length > 0) {
      rows.push({ values: row });
    }
  }
    
  return rows;
}


function isAdminUser(){
 var email = Session.getEffectiveUser().getEmail();
  if( email == 'steven@itsnotthatkind.org' ){
    return true; 
  } else {
    return false;
  }
}

/**** BEGIN: OAuth Methods ****/

function getAuthType() {
  var response = { type: 'OAUTH2' };
  return response;
}

function resetAuth() {
  getOAuthService().reset();
}

function isAuthValid() {
  return getOAuthService().hasAccess();
}

function getOAuthService() {
  return OAuth2.createService('exampleService')
    .setAuthorizationBaseUrl('https://www.facebook.com/dialog/oauth')
    .setTokenUrl('https://graph.facebook.com/v5.0/oauth/access_token')      
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCallbackFunction('authCallback')
    .setScope('pages_show_list, manage_pages, read_insights');
};

function authCallback(request) {
  var authorized = getOAuthService().handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  };
};

function get3PAuthorizationUrls() {
  return getOAuthService().getAuthorizationUrl();
}

/**** END: OAuth Methods ****/

