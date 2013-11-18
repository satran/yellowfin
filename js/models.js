// Here comes all the models

var GUser = Backbone.Model.extend({});
var GUserList = Backbone.Collection.extend({
    model: GUser
});


var GOrg = Backbone.Model.extend({});
var GOrgList = Backbone.Collection.extend({
    model: GOrg
});


var GRepo = Backbone.Model.extend({
});
var GRepoList = Backbone.Collection.extend({
    model: GRepo
});


var GIssue = Backbone.Model.extend({
    dateRegex: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g,
    embeddedRegex: /<!-- ###FromDate: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z###ToDate: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z### -->/,
    
    idAttribute: "number",
    
    initialize: function(){
        this.getDates();
    },
    
    getDates: function(){
        var embeddedDate = this.getEmbeddedDate();
        if (embeddedDate !== null && embeddedDate.length > 0){
            var matchedText = embeddedDate[0].match(this.dateRegex);
            if (matchedText !== null){
                this.startDate = new Date(Date.parse(matchedText[0]));
                if (matchedText.length > 1)
                    this.endDate = new Date(Date.parse(matchedText[1]));
                else
                    this.endDate = this.startDate;
            }
        }
    },
    
    getEmbeddedDate: function(){
        var body = this.get("body");
        return body.match(this.embeddedRegex);
    },
    
    updateDate: function(startDate, endDate){
        if (endDate === null)
            endDate = startDate;
        
        this.startDate = startDate;
        this.endDate = this.endDate;
        var newBody = "<!-- ###FromDate: " + startDate.toISOString() + 
                      "###ToDate: " + endDate.toISOString() + "### -->";
        var body = this.get("body");
        if (body.match(this.embeddedRegex)){
            this.set("body", body.replace(this.embeddedRegex, newBody));
        }
        else{
            this.set("body", body + "\n" + newBody);
        }
        this.save({body: this.get("body")}, {patch: true});
    }
});

var GIssueList = Backbone.Collection.extend({
    model: GIssue,
    url: function(){
        var url = document.location.hash.split("/");
        return ["https://api.github.com/repos", url[1], url[2], "issues"].join("/");
    }
});


