var App = {};

$(document).ready(function() {
    // All variables that must persist throughout the app's lifetime.

    var AppSettings = {
        keys: {
            credentials: "credentials",
            user: "user_details",
            orgs: "organizations",
            repos: "repositories"
        },
        baseUrl: "https://api.github.com",
        refresh: true
    };


    function clearAppAndTool() {
        $('#content').html('');
        $('#toolBar').html('');
    }


    function createListOfModels(list, Model) {
        var modelObjects = [];
        _.each(list, function(item) {
            var modelObject = new Model(item);
            modelObjects.push(modelObject);
        });
        return modelObjects;
    }


    function getAuth() {
        if (App.auth !== undefined) {
            return true;
        }
        var credentials = localStorage.getItem(AppSettings.keys.credentials);
        if (credentials === null)
            return false;
        else {
            App.auth = credentials;
            setUpApp();
            return true;
        }
    }


    function setUpApp() {
        // Let all request have the authentication.
        $.ajaxSetup({
            beforeSend: function(xhr) {
                xhr.setRequestHeader("Authorization", "Basic " + App.auth);
            }
        });
    }


    function setAuth(username, password) {
        var auth = btoa(username + ":" + password);
        localStorage.setItem(AppSettings.keys.credentials, auth);
        App.auth = auth;
        setUpApp();
    }


    function fetchAuthenticatedUser() {
        $.ajax({
            url: [AppSettings.baseUrl, "user"].join("/"),
            success: function(data) {
                App.user = data;
                localStorage.setItem(AppSettings.keys.user,
                    JSON.stringify(data));
                // Set the user image to the appropriate one
                $('#userImage').attr("src", App.user.avatar_url);

            },
            async: false
        });
    }


    function loadUser() {
        // If Auth details not ready yet return false.
        if (!getAuth())
            return false;

        // Check if we have a cache of the logged in user.
        var user_string = localStorage.getItem(AppSettings.keys.user);
        if (user_string === null) {
            fetchAuthenticatedUser();
            return true;
        }
        // Load the user to the App.
        App.user = JSON.parse(user_string);
        if (App.user !== undefined) {
            // Set the user image to the appropriate one
            $('#userImage').attr("src", App.user.avatar_url);
            return true;
        }
        return false;
    }


    function renderRepoView() {
        App.repoView = new RepoApp(App.repos);
    }


    // This requires App.orgs to be populated.
    function fetchAllRepos() {
        App.reposList = [];

        if (App.orgs === undefined)
            fetchAllOrgs();

        var repos = localStorage.getItem(AppSettings.keys.repos);

        if (AppSettings.refresh || repos === null) {
            App.orgs.each(function(org, position, l) {
                $.ajax({
                    url: [AppSettings.baseUrl, "orgs",
                        org.attributes.login, "repos"
                    ].join("/"),
                    success: function(data) {
                        App.reposList.push.apply(App.reposList, data);
                        localStorage.setItem(AppSettings.keys.repos,
                            JSON.stringify(App.reposList));
                    },
                    async: false
                });
            });
        } 
        else {
            App.reposList = JSON.parse(repos);
        }

        App.repos = new GRepoList(createListOfModels(App.reposList, GRepo));
        return true;
    }


    function fetchAllOrgs() {
        var orgs = localStorage.getItem(AppSettings.keys.orgs);
        var orgList;
        if (AppSettings.refresh || orgs === null)
            $.ajax({
                url: [AppSettings.baseUrl, "user/orgs"].join("/"),
                success: function(data) {
                    orgList = data;
                    localStorage.setItem(AppSettings.keys.orgs, JSON.stringify(data));
                },
                async: false
            });
        else {
            orgList = JSON.parse(orgs);
        }
        App.orgs = new GOrgList(createListOfModels(orgList, GOrg));
    }


    function fetchCurrentRepo(owner, repoName) {
        // TODO: check the local copy of repos before querying.
        $.ajax({
            url: [AppSettings.baseUrl, "repos", owner, repoName].join("/"),
            success: function(data) {
                App.currentRepo = new GRepo(data);
            },
            async: false
        });
    }


    function setCurrentRepoAndOrg(owner, repoName) {
        if (App.repos === undefined)
            fetchCurrentRepo(owner, repoName);
        else
            App.currentRepo = App.repos.findWhere({
                name: repoName
            });

        if (App.orgs === undefined)
            fetchAllOrgs();
        App.currentOrg = App.orgs.findWhere({
            login: App.currentRepo.attributes.owner.login
        });
    }


    function fetchMembersOfOrg(org) {
        if (App.members === undefined)
            App.members = {};

        $.ajax({
            url: [AppSettings.baseUrl, "orgs", org.attributes.login, "members"].join("/"),
            success: function(data) {
                App.members[org.get("login")] = new GUserList(
                    createListOfModels(data, GUser));
            },
            async: false
        });
    }
    
    
    function fetchIssuesOfRepo(owner, repoName){
        if (App.issues === undefined)
            App.issues = {};

        if (App.issues[owner + repoName] === undefined) {
            $.ajax({
                url: [AppSettings.baseUrl, "repos", owner, repoName, "issues"].join("/"),
                success: function(data) {
                    App.issues[owner + repoName] = new GIssueList(
                        createListOfModels(data, GIssue));
                },
                async: false
            });
        }        
    }


    function renderCalView(owner, repoName) {
        var issues = App.issues[owner+repoName];
        var calView = new IssueCalendar({issues: issues, container: $("#content"), 
                                         toolbar: $("#toolBar"), repo: repoName, 
                                         owner: owner});
    }

    var Workspace = Backbone.Router.extend({
        routes: {
            "": "index",
            "login": "login",
            "logout": "logout",
            "repos/:owner/:repoName": "repo"
        },

        index: function() {
            // If not yet logged in lets redirect to the login page
            if (!getAuth()) {
                this.navigate("login", {
                    trigger: true
                });
            }
            
            clearAppAndTool();

            // Fetch the user's details
            loadUser();

            // Load the user's organizations
            fetchAllOrgs();

            // Load the loginWindow
            $('#loginWindow').modal({
                keyboard: true,
                show: false
            });

            $('#loader').show();

            // Fetch all repos
            fetchAllRepos();

            // Render the repos view
            renderRepoView();

            $('#loader').hide();

        },

        login: function() {
            $('#loader').hide();
            
            $('#loginWindow').modal('show');
        },

        logout: function() {
            localStorage.removeItem(AppSettings.keys.credentials);
            localStorage.removeItem(AppSettings.keys.user);
            localStorage.removeItem(AppSettings.keys.orgs);
            localStorage.removeItem(AppSettings.keys.repos);
            this.navigate("login", {
                trigger: true
            });
            App = {};
        },

        repo: function(owner, repoName) {
            clearAppAndTool();
            
            $('#loader').show();

            setCurrentRepoAndOrg(owner, repoName);

            fetchMembersOfOrg(App.currentOrg);

            fetchIssuesOfRepo(owner, repoName);
            App.issueView = new IssueSideBar({issues: App.issues[owner + repoName], 
                                             container: $("#sideBar")});
            $('#sideBar').show();

            renderCalView(owner, repoName);
            $('#loader').hide();
        }
    });


    // Main router.
    urls = new Workspace();


    // Register all the events

    // Login user on click.
    $("#loginWindow button").on("click", function() {
        var username = $("#loginWindow input[name=username]").val();
        var password = $("#loginWindow input[name=password]").val();
        setAuth(username, password);
        $('#loginWindow').modal('hide');
        urls.navigate("", {
            trigger: true
        });

        // Fetch the user's details
        loadUser();
    });


    // Settings for the markdown parser
    marked.setOptions({
        gfm: true
    })

    Backbone.$ = $;
    Backbone.history.start();
});