sap.ui.define([
	"jquery.sap.global",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/Controller"
], function(jQuery, Button, Dialog, MessageToast, MessageBox, Fragment, Controller) {
	"use strict";

	return Controller.extend("com.hcl.poc.RepositoryBrowser.controller.RepositoryBrowserView", {
		/**
		 *	Init function
		 */
		onInit: function() {
			
		},
		
		/**
		 *	Before rendering function
		 */
		onBeforeRendering: function() {
			this.getView().byId("vboxExplorer").setVisible(false);
		},
		
		/**
		 *	After rendering function
		 */
		onAfterRendering: function() {
			
		},
		
		/**
		 *	Validates the Repository Details entered and forward request for explore the repository
		 *  @param {Event} oEvent :
		 */
		onBrowseRepository: function(oEvent) {
			this.updateFolderPath();
			
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			if(((this.getView().byId("txtRepositoryName")).getValue()).trim() === "") {
				MessageBox.alert(
					"Enter the Repository Name.",
					{
						icon: sap.m.MessageBox.Icon.WARNING,
						title: "Error Message",
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			} else if(((this.getView().byId("txtRepositoryKey")).getValue()).trim() === "") {
				MessageBox.alert(
					"Enter the Repository Key.",
					{
						icon: sap.m.MessageBox.Icon.WARNING,
						title: "Error Message",
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			} else {
				sap.ui.core.BusyIndicator.show(0);
				this._repositoryName = (this.getView().byId("txtRepositoryName")).getValue();
				this._repositoryKey = (this.getView().byId("txtRepositoryKey")).getValue();
				this._parentId = [""];
				this.getContentList();
			}
		},
		
		/**
		 *	Returns the content list of the repository for a given path
		 */
		getContentList: function() {
			var that = this;
			var documentServiceURL = "/destinations/ZREPOSITORYSERIVICE/DocumentServicePOC/DocumentOperations";
			
			jQuery.ajax({
				url: documentServiceURL,
				type: "GET",				
		        dataType: "JSON",
				data: {repoDetails:that.getRepositorySpec("GET_LIST")},
				beforeSend: function(xhr) {
					
				},
				success: function(oData) {
					if((oData.error).ERROR_MSG === "") {
						var fileFolderListModel = new sap.ui.model.json.JSONModel(that.updateIcons(oData));
						sap.ui.getCore().setModel(fileFolderListModel,"fileFolderListModel");
						that.getView().byId("tblFileSet").setModel(fileFolderListModel);
						fileFolderListModel.refresh();
						
						/*	First time breadcrumb load - START	*/
						var brdCrmbFolderPath = that.getView().byId("brcmbFile");
						if(brdCrmbFolderPath.getLinks().length === 0 && brdCrmbFolderPath.getCurrentLocationText() === "") {
							brdCrmbFolderPath.setCurrentLocationText((that.getView().byId("txtRepositoryName")).getValue());
						}
						/*	First time breadcrumb load - END	*/
						
						that.getView().byId("vboxRepoParams").setVisible(false);
						that.getView().byId("vboxExplorer").setVisible(true);
					} else {
						MessageToast.show((oData.error).ERROR_MSG);
					}
					sap.ui.core.BusyIndicator.hide();
				},
				error: function(oData) {
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},
		
		/**
		 *	Populates the breadcrumb folder path with repository navigations
		 * 	@param {Event} oEvent :
		 */
		onPressRepsitoryNavigation: function(oEvent) {
			sap.ui.core.BusyIndicator.show(0);
			var that = this;
			var sourceLink = oEvent.getSource();
			var brdCrmbFolderPath = this.getView().byId("brcmbFile");
			if(brdCrmbFolderPath.indexOfLink(sourceLink) >= 0) {	//Navigate Back from Bread Crumb
				for(var i = brdCrmbFolderPath.indexOfLink(sourceLink); i < brdCrmbFolderPath.getLinks().length; i++) {
					brdCrmbFolderPath.removeLink((brdCrmbFolderPath.getLinks())[i]);
				}
				brdCrmbFolderPath.setCurrentLocationText(sourceLink.getText());
				
				//Update parent ID array
				(this._parentId).splice(brdCrmbFolderPath.indexOfLink(sourceLink));
			} else {	//Navigate forward into nested folders
				var brdCmbLnk = new sap.m.Link({});
				brdCmbLnk.setText(brdCrmbFolderPath.getCurrentLocationText());
				brdCmbLnk.attachPress(function(pressEvent){
					that.onPressRepsitoryNavigation(pressEvent);
				});
				brdCrmbFolderPath.insertLink(brdCmbLnk);
				brdCrmbFolderPath.setCurrentLocationText(sourceLink.getText());
				
				//Update parent ID array
				var contentTable = this.getView().byId("tblFileSet");
				var oModel = contentTable.getModel();
				var parentId = (oModel.getProperty((sourceLink.getBindingContext()).getPath())).ID;
				(this._parentId).push(parentId);
			}
			
			this.updateFolderPath();
			this.getContentList();
		},
		
		/**
		 *	Update and stores the current folder path of repository navigation
		 */
		updateFolderPath:function(){
			var brdCrmbFolderPath = this.getView().byId("brcmbFile");
			var filePath = "";
			var linkList = brdCrmbFolderPath.getLinks();
			for(var i = 1; i < linkList.length; i++) {	//i=1 for not to include the root
				if(this._folderPath === "") {
					filePath = linkList[i].getText();
				} else {
					filePath = filePath + "/" + linkList[i];
				}
			}
			if(linkList.length === 1)	{
				filePath = filePath + brdCrmbFolderPath.getCurrentLocationText();
			} else if(linkList.length > 1) {
				filePath = filePath + "/" + brdCrmbFolderPath.getCurrentLocationText();
			}
			
			this._folderPath = filePath;
		},
		
		/**
		 *	Updates the icons data based on the repository content
		 *	@param {JSON} oData :
		 *	@return {JSON} oData :
		 */
		updateIcons: function(oData) {
			for(var i = 0; i < oData.results.length; i++) {
				if(((oData.results)[i]).TYPE === "FOLDER") {
					((oData.results)[i]).ICON = "folder-blank";
				} else if(((oData.results)[i]).TYPE === "FILE") {
					((oData.results)[i]).ICON = "document";
				}
			}
			
			return oData;
		},
		
		/**
		 *	Action executed after user click on the content of the repository
		 *	@param {Event} oEvent :
		 */
		onPressContentLink: function(oEvent) {
			var sourceLink = oEvent.getSource();
			var contentTable = this.getView().byId("tblFileSet");
			var oModel = contentTable.getModel();
			var contentType = (oModel.getProperty((sourceLink.getBindingContext()).getPath())).TYPE;
			
			if(contentType === "FOLDER") {
				this.onPressRepsitoryNavigation(oEvent);
			} else if(contentType === "FILE") {
				this.onPressFileDownload(oEvent);
			}
		},
		
		/**
		 *	Populates the repository content add menu items
		 * 	@param {Event} oEvent :
		 */
		onRepositoryAdd: function(oEvent) {
			var oButton = oEvent.getSource();

			// create menu only once
			if (!this._menu) {
				this._menu = sap.ui.xmlfragment("com.hcl.poc.RepositoryBrowser.fragment.repositoryAddMenu",this);
				this.getView().addDependent(this._menu);
			}

			var eDock = sap.ui.core.Popup.Dock;
			this._menu.open(this._bKeyboard, oButton, eDock.BeginTop, eDock.BeginBottom, oButton);
		},
		
		/**
		 *	Deletes the selected items form repository
		 * 	@param {Event} oEvent :
		 */
		onDeleteContent: function(oEvent) {
			var that = this;
			var contentTable = this.getView().byId("tblFileSet");
			var oModel = contentTable.getModel();
			var deletedItemId = "";
			var deletedItemName = "";
			var deletedItemType = "";
			var deleteObjectArray = [];
			
			if(contentTable.getSelectedItems().length > 0) {
				sap.m.MessageBox.show(
					"Are you sure to delete the selected contents?", {
						icon: sap.m.MessageBox.Icon.QUESTION,
						title: "Please confirm",
						actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
						onClose: function(oAction) {
							if(oAction === MessageBox.Action.YES) {
								sap.ui.core.BusyIndicator.show(0);
								for(var i = 0; i < contentTable.getSelectedItems().length; i++) {
								    deletedItemId = (oModel.getProperty((contentTable.getSelectedItems())[i].getBindingContextPath())).ID;
								    deletedItemName = (oModel.getProperty((contentTable.getSelectedItems())[i].getBindingContextPath())).FILENAME;
								    deletedItemType = (oModel.getProperty((contentTable.getSelectedItems())[i].getBindingContextPath())).TYPE;
								    var deleteObject = {};
								    deleteObject.CONTENT_ID = deletedItemId;
								    deleteObject.CONTENT_NAME = deletedItemName;
								    deleteObject.CONTENT_PATH = that._folderPath;
								    deleteObject.CONTENT_TYPE = deletedItemType;
								    deleteObjectArray.push(JSON.stringify(deleteObject));
								}
								
								var documentServiceURL = "/destinations/ZREPOSITORYSERIVICE/DocumentServicePOC/DocumentOperations";// + urlParameters;
								jQuery.ajax({
									url: documentServiceURL,
									type: "POST",
							        dataType: "JSON",
									data: {repoDetails:that.getRepositorySpec("DELETE_CONTENT"),deleteData:deleteObjectArray},
									beforeSend: function(xhr) {
										
									},
									success: function(oData) {
										if((oData.error).ERROR_MSG === "") {
											that.getContentList();
										} else {
											MessageToast.show((oData.error).ERROR_MSG);
										}
										sap.ui.core.BusyIndicator.hide();
									},
									error: function(oData) {
										sap.ui.core.BusyIndicator.hide();
									}
								});
							}
						}
					}
			    );
			} else {
				var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.alert(
					"Select at least one item to delete...", {
						icon: sap.m.MessageBox.Icon.WARNING,
						title: "Error Message",
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			}
		},
		
		/**
		 *	Logs out user form repository
		 * 	@param {Event} oEvent :
		 */
		onLogoutRepository: function(oEvent) {
			var that = this;
			sap.m.MessageBox.show(
					"Are you sure to disconnect the repository?", {
					icon: sap.m.MessageBox.Icon.QUESTION,
					title: "Please confirm",
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
					onClose: function(oAction) {
						if(oAction === MessageBox.Action.YES) {
							that.showBusyIndicatorWithDelay(1000,0);
							var tblRepositoryContent = that.getView().byId("tblFileSet");
							tblRepositoryContent.destroyItems();
							that.getView().byId("vboxExplorer").setVisible(false);
							that.getView().byId("vboxRepoParams").setVisible(true);
							MessageToast.show("Successfully logged out from the Repository...");
						}
					}
				}
		    );
		},
		
		/**
		 *	Initialized the Busy Indicator with defined delay
		 *	@param {number} iDuration :
		 * 	@param {number} iDelay :
		 */
		showBusyIndicatorWithDelay: function (iDuration, iDelay) {
			sap.ui.core.BusyIndicator.show(iDelay);

			if (iDuration && iDuration > 0) {
				if (this._sTimeoutId) {
					jQuery.sap.clearDelayedCall(this._sTimeoutId);
					this._sTimeoutId = null;
				}

				this._sTimeoutId = jQuery.sap.delayedCall(iDuration, this, function() {
					sap.ui.core.BusyIndicator.hide();
				});
			}
		},
		
		/**
		 *	Opens up the file selection dialog
		 * 	@param {Event} oEvent :
		 */
		onHandleAddFile: function(oEvent) {
			var that = this;
			if (!this._fileUploadDialog) {
				this._fileUploadDialog = new Dialog({
					icon : "sap-icon://upload-to-cloud",
					title: "Add file to Repository",
					content: sap.ui.xmlfragment("com.hcl.poc.RepositoryBrowser.fragment.repositoryAddFile", that),
					beginButton: new Button({
						text: "Close",
						press: function () {
							that._fileUploadDialog.close();
						}
					})
				});
			}
			
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._fileUploadDialog);
			this._fileUploadDialog.open();
		},
		
		/**
		 *	Adds selected file into repository
		 * 	@param {Event} oEvent :
		 */
		handleUploadPress: function(oEvent) {
			sap.ui.core.BusyIndicator.show(0);
			var that = this;
			var urlParameters = "";
			var file = ((((this._fileUploadDialog).getContent()[0]).getContent()[0]).getFocusDomRef()).files[0];
			var formData = new FormData();
            formData.append("file", file);
			
			urlParameters = "?FOLDER_PATH=" + this._folderPath + "&OPERATION_TYPE=UPLOAD_FILE";
			var documentServiceURL = "/destinations/ZREPOSITORYSERIVICE/DocumentServicePOC/DocumentOperations" + urlParameters;
			
			jQuery.ajax({
				url: documentServiceURL,
				enctype: "multipart/form-data",
				processData: false,  // Important!
		        contentType: false,
		        cache: false,
				data: formData,
				type: "POST",
				beforeSend: function(xhr) {
					
				},
				success: function(oData) {
					if((oData.error).ERROR_MSG === "") {
						that.getContentList();
						that._fileUploadDialog.close();
						MessageToast.show("File successfully added to repository");
					} else {
						MessageToast.show((oData.error).ERROR_MSG);
					}
					sap.ui.core.BusyIndicator.hide();
				},
				error: function(oData) {
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},
		
		/**
		 *	Opens up the folder creation dialog
		 * 	@param {Event} oEvent :
		 */
		onHandleAddFolder: function(oEvent) {
			var that = this;
			if (!this._folderCreateDialog) {
				this._folderCreateDialog = new Dialog({
					icon : "sap-icon://add-folder",
					title: "Add new folder to Repository",
					content: sap.ui.xmlfragment("com.hcl.poc.RepositoryBrowser.fragment.repositoryCreateFolder", that),
					beginButton: new Button({
						text: "Create",
						press: function() {
							that.handleCreateFolder();
							that._folderCreateDialog.close();
						}
					}),
					endButton: new Button({
						text: "Close",
						press: function() {
							that._folderCreateDialog.close();
						}
					})
				});
			}
			
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._folderCreateDialog);
			this._folderCreateDialog.open();
		},
		
		/**
		 *	Creates new folder in repository
		 */
		handleCreateFolder: function() {
			sap.ui.core.BusyIndicator.show(0);
			var that = this;
			var documentServiceURL = "/destinations/ZREPOSITORYSERIVICE/DocumentServicePOC/DocumentOperations";
			var userInputDataList = [];
			var userInputData = {};
			userInputData.FOLDER_NAME = sap.ui.getCore().byId("txtFolderName").getValue();
			userInputDataList.push(JSON.stringify(userInputData));
			
			jQuery.ajax({
				url: documentServiceURL,
				type: "POST",
		        dataType: "JSON",
				data: {repoDetails:that.getRepositorySpec("CREATE_FOLDER"),userData:userInputDataList},
				beforeSend: function(xhr) {
					
				},
				success: function(oData) {
					if((oData.error).ERROR_MSG === "") {
						that.getContentList();
						MessageToast.show("Folder successfully added to repository");
					} else {
						MessageToast.show((oData.error).ERROR_MSG);
					}
					sap.ui.core.BusyIndicator.hide();
				},
				error: function(oData) {
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},
		
		/** 
		 *	Download selected file from repository
		 * 	@param {Event} oEvent :
		 */
		onPressFileDownload: function(oEvent) {
			var that = this;
			var sourceLink = oEvent.getSource();
			var contentTable = this.getView().byId("tblFileSet");
			var oModel = contentTable.getModel();
			var documentName = (oModel.getProperty((sourceLink.getBindingContext()).getPath())).FILENAME;
			var userInputDataList = [];
			var userInputData = {};
			userInputData.DOC_ID = (oModel.getProperty((sourceLink.getBindingContext()).getPath())).ID;
			userInputDataList.push(JSON.stringify(userInputData));
			var documentServiceURL = "/destinations/ZREPOSITORYSERIVICE/DocumentServicePOC/DocumentOperations";
			
			jQuery.ajax({
				url: documentServiceURL,
				data: {repoDetails:that.getRepositorySpec("DOWNLOAD_DOC"),userData:userInputDataList},
				type: "GET",
				beforeSend: function(xhr) {
					
				},
				success: function(oData) {
					if(jQuery.isEmptyObject(oData)) {
						var blob = new Blob([oData]);
					    var link = document.createElement("a");
					    link.href = window.URL.createObjectURL(blob);
					    link.download = documentName;
					    link.click();
					} else if((oData.error).ERROR_MSG !== "") {
						MessageToast.show((oData.error).ERROR_MSG);
					}
				},
				error: function(oData) {
					sap.m.MessageToast.show("ERROR");
				}
			});
		},
		
		/** 
		 *	Move content within repository dialog open
		 * 	@param {Event} oEvent :
		 */
		onRepositoryMove: function(oEvent) {
			
		},
		
		/**
		 * 
		 * @param {string} operation :
		 * @return {string[]} repositorySpecArray :
		 */
		getRepositorySpec: function(operation) {
			var repositorySpec = {};
			var repositorySpecArray = [];
			
			repositorySpec.REPO_NAME = this._repositoryName;
			repositorySpec.REPO_KEY = this._repositoryKey;
			repositorySpec.FOLDER_PATH = this._folderPath;
			repositorySpec.PARENT_ID = (this._parentId)[((this._parentId).length) - 1];
			repositorySpec.OPERATION_TYPE = operation;
			
			repositorySpecArray.push(JSON.stringify(repositorySpec));
			return repositorySpecArray;
		}
	});
});