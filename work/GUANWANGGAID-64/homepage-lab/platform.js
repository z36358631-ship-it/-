(() => {
  'use strict';
  // OS and market are independent dimensions. No account or service is switched.
  function features(state){
    return {compatibleCatalog:state.os!=='ios',compatQuery:state.os!=='ios',latestCompatibility:state.os!=='ios',cloud:state.region!=='overseas'};
  }
  function allowsPage(state,page){
    const f=features(state);
    if(!f.compatibleCatalog&&page==='compatibility')return false;
    if(!f.latestCompatibility&&page==='latest-compatibility')return false;
    if(!f.cloud&&['cloud-list','team-list','cloud-info','pricing'].includes(page))return false;
    if(!f.cloud&&page==='ret-business'&&['battle','catquest'].includes(state.retBusiness))return false;
    return true;
  }
  window.LAB_PLATFORM={features,allowsPage};
})();
