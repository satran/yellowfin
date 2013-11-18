var RepoView = Backbone.View.extend({

    tagName: "div",

    className: "repo",

    template: _.template($('#repoTemplate').html()),

    initialize: function(){
        this.render();
    },

    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
    
});


var RepoApp = Backbone.View.extend({
    constructor: function(repos){
        this.repos = repos;
        this.addAll();
    },
    
    addOne: function(repo){
        var view = new RepoView({model: repo});
        $("#content").append(view.render().el);
    },

    addAll: function(){
        this.repos.each(this.addOne, this);
        $("#toolBar").html(_.template($("#repoToolBarTemplate").html())());
        $("#sideBar").html('');
        $('#sideBar').hide();
    }
});



var IssueView = Backbone.View.extend({
    tagName: "li",

    className: "issue",

    events: {
        "dblclick": "showDetail"
    },

    template: _.template($("#issueTemplate").html()),

    showDetail: function(){
        new IssueDetailView({
            container: $("#issueDetail"),
            model: this.model
        });
    },

    initialize: function(){
        this.render();
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});


var IssueSideBar = Backbone.View.extend({
    initialize: function(args){
        this.issues = args.issues;
        this.container = args.container;
        this.container.html('');
        this.addAll();
    },
    
    addOne: function(issue){
        var view = new IssueView({model: issue});
        this.container.append(view.render().el);
        view.$el.draggable({
            zIndex: 2000,
            revert: true,
            scroll: false
        });
        view.el.dataset.model = issue.id;
    },

    addAll: function(){
        this.issues.each(this.addOne, this);
    }
});


var IssueCalendar = Backbone.View.extend({
    tagName: "div",
    
    id: "issueCalendar",
    
    today: new Date,
    
    defaultEventColor: "#0EA5A0",
    
    overDueEventColor: "#cc6666",
    
    initialize: function(args){
        this.container = args.container;
        this.toolbar = args.toolbar;
        this.repo = args.repo;
        this.owner = args.owner;
        this.issues = args.issues;
        
        this.generateEvents(this.issues);
        this.render();
    },
    
    generateEvents: function(issues){
        var view = this;
        if (this.events === undefined){
            var events = []; 
            issues.each(function(issue){
                if(issue.startDate !== undefined){
                    var classes = [];
                    var color = view.defaultEventColor;
                    if (issue.get("milestone") !== null){
                        classes.push("milestone_" + issue.get("milestone").number);
                    }
                
                    if (issue.get("assignee") !== null){
                        classes.push("assignee_" + issue.get("assignee").login);
                    }
                
                    if (issue.endDate === undefined){
                        issue.endDate = issue.startDate;
                    }
                    
                    if (issue.endDate < view.today){
                        color = view.overDueEventColor;
                    }
                    events.push({title: "#" + issue.get("number") + " " + issue.get("title"),
                                 start: issue.startDate, 
                                 end: issue.endDate, 
                                 model: issue, 
                                 className: classes, 
                                 borderColor: color, 
                                 backgroundColor: color
                             });
                }
            });
            this.events = events;
        }
    },
    
    changeEvent: function(event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ){
        event.model.updateDate(event.start, event.end);
    },
    
    clickEvent: function(calEvent, jsEvent, view) {
        // TODO: Sometime later use popup to show issues.
        // $(jsEvent.currentTarget).popover({
        //     title: calEvent.model.get("title"),
        //     content: markdown.toHTML(calEvent.model.get("body")),
        //     html: true, 
        //     position: "auto left"
        // });
        // $(jsEvent.currentTarget).popover('toggle');
        var issueDetail = new IssueDetailView({
            container: $("#issueDetail"),
            model: calEvent.model
        });
    },
    
    renderCalendar: function(){
        var view = this;
        view.$el.fullCalendar({
            header: {
                left: '',
                center: '',
                right: 'title'
            },
            theme: false,
            events: view.events,
            eventBackgroundColor: 'rgba(14, 165, 160, 1)',
            eventBorderColor: 'rgba(14, 165, 160, 1)',
            editable: true,
            droppable: true,
            drop: function(date, allDay) {
                var modelId = $(this).data('model');
                var issue = view.issues.get(modelId);
                
                issue.updateDate(date, date);
                var eventObject = {
                    'title': "#" + issue.get("number") + " " + issue.get("title"),
                    'model': issue
                };

                eventObject.start = date;
                eventObject.end = date;
                eventObject.allDay = allDay;
                
                if (eventObject.end < view.today){
                    eventObject.color = view.overDueEventColor;
                    eventObject.backgroundColor = view.overDueEventColor;
                }
                else{
                    eventObject.color = view.defaultEventColor;
                    eventObject.backgroundColor = view.defaultEventColor;
                }

                view.$el.fullCalendar('renderEvent', eventObject, true);
            },
            eventClick: view.clickEvent,
            eventDrop: this.changeEvent,
            eventResize: this.changeEvent
        });
    }, 
    
    renderToolBar: function(){
        var view = this;
        this.toolbar.html(_.template($("#issueCalendarToolBarTemplate").html())());
        this.toolbar.find(".calPrev").on('click', function() {
            view.$el.fullCalendar('prev');
        });
        this.toolbar.find(".calNext").on('click', function() {
            view.$el.fullCalendar('next');
        });
        this.toolbar.find(".calToday").on('click', function() {
            view.$el.fullCalendar('today');
        });
        this.toolbar.find(".calMonth").on('click', function() {
            view.$el.fullCalendar('changeView', 'month');
        });
        this.toolbar.find(".calWeek").on('click', function() {
            view.$el.fullCalendar('changeView', 'agendaWeek');
        });
    }, 
    
    render: function(){
        this.container.html(this.$el);
        this.renderToolBar();
        this.renderCalendar();
    }
});


var IssueDetailView = Backbone.View.extend({
    tagName: "div",

    template: _.template($("#issueDetailTemplate").html()),
    
    initialize: function(args){
        this.container = args.container;
        this.model = args.model;
        
        this.render();
    },
    
    render: function(){
        var view = this;
        this.$el.html(this.template(this.model.toJSON()));
        this.container.html(this.$el);
        this.container.show("slide", { direction: "right" });
        this.container.find(".close").on("click", function(){
            view.container.hide();
        });
    }
    
});