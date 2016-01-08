/**
 * @module QDR
 */
/**
 * @module QDR
 */
var QDR = (function (QDR) {

  /**
   * @method ChartsController
   * @param $scope
   * @param QDRServer
   * @param QDRChartServer
   *
   * Controller that handles the QDR charts page
   */
	QDR.OverviewController = function($scope, QDRService, QDRChartService, dialogService, localStorage, $location) {


		if (!angular.isDefined(QDRService.schema))
		    return;

		var nodeIds = QDRService.nodeIdList();
		var currentTimer;
		var refreshInterval = 5000
	    $scope.modes = [
	    	{title: 'Overview', name: 'Overview', right: false}
	    	];

		$scope.templates =
		    [ { name: 'Routers', url: 'routers.html'},
		      { name: 'Router', url: 'router.html'},
              { name: 'Addresses', url: 'addresses.html'},
		      { name: 'Address', url: 'address.html'},
              { name: 'Connections', url: 'connections.html'},
		      { name: 'Connection', url: 'connection.html'},
              { name: 'Logs', url: 'logs.html'},
              { name: 'Log', url: 'log.html'} ];

		$scope.overview = new Folder("Overview");

		$scope.allConnectionFields = [];
		var allConnectionCols = [
			 {
				 field: 'routerId',
				 displayName: 'Router'
			 },
			 {
				 field: 'area',
				 displayName: 'Area'
			 },
			 {
				 field: 'mode',
				 displayName: 'Mode'
			 },
			 {
				 field: 'connections',
				 displayName: 'External connections'
			 },
             {
                 field: 'addrCount',
                 displayName: 'Address count'
             },
             {
                 field: 'linkCount',
                 displayName: 'Link count'
             }
		];
		$scope.mySelections = [];
		$scope.allConnections = {
			data: 'allConnectionFields',
			columnDefs: allConnectionCols,
			enableColumnResize: true,
			multiSelect: false,
			selectedItems: $scope.mySelections,
			afterSelectionChange: function(data) {
				if (data.selected) {
					var selItem = $scope.mySelections[0]
					var nodeId = selItem.nodeId
					// activate Routers->nodeId in the tree
					$("#overtree").dynatree("getTree").activateKey(nodeId);

				}
            }
		};
		// get info for all routers
		var allRouterInfo = function () {
			nodeIds = QDRService.nodeIdList()
			var expected = Object.keys(nodeIds).length
			var received = 0;
			var allConnectionFields = [];
			var gotNodeInfo = function (nodeName, entity, response) {
				var results = response.results;
				var name = QDRService.nameFromId(nodeName)
				var connections = 0;
				results.forEach( function (result) {
					var role = QDRService.valFor(response.attributeNames, result, "role")
					if (role != 'inter-router') {
						++connections
					}
				})
				allConnectionFields.push({routerId: name, connections: connections, nodeId: nodeName})
				++received
				if (expected == received) {
					allConnectionFields.sort ( function (a,b) { return a.routerId < b.routerId ? -1 : a.routerId > b.routerId ? 1 : 0})
					// now get each router's node info
					QDRService.getMultipleNodeInfo(nodeIds, "router", [], function (nodeIds, entity, response) {
						var results = response.aggregates
						results.forEach ( function (result) {

							var routerId = QDRService.valFor(response.attributeNames, result, "routerId").sum
							allConnectionFields.some( function (connField) {
								if (routerId === connField.routerId) {
									response.attributeNames.forEach ( function (attrName) {
										connField[attrName] = QDRService.valFor(response.attributeNames, result, attrName).sum
									})
									return true
								}
								return false
							})
						})
						$scope.allConnectionFields = allConnectionFields
						$scope.$apply()
						if (currentTimer) {
							clearTimeout(currentTimer)
						}
						currentTimer = setTimeout(allRouterInfo, refreshInterval);
					}, nodeIds[0])
				}
			}
			nodeIds.forEach ( function (nodeId) {
				QDRService.getNodeInfo(nodeId, ".connection", ["role"], gotNodeInfo)
			})

		}

		// get info for a single router
		var routerInfo = function (node) {
			$scope.router = node
			$scope.routerFields = []
			var cols = [
				 {
					 field: 'attribute',
					 displayName: 'Attribute',
					 width: '40%'
				 },
				 {
					 field: 'value',
					 displayName: 'Value',
					 width: '40%'
				 }
			]
			$scope.routerGrid = {
				data: 'routerFields',
				columnDefs: cols,
				enableColumnResize: true,
				multiSelect: false,
				beforeSelectionChange: function() {
					  return false;
				}
			}

			$scope.allConnectionFields.some( function (field) {
				if (field.routerId === node.data.title) {
					Object.keys(field).forEach ( function (key) {
						$scope.routerFields.push({attribute: key, value: field[key]})
					})
					return true
				}
			})

			$scope.$apply()
			if (currentTimer) {
				clearTimeout(currentTimer)
				currentTimer = null
			}
		}

		// get info for a all addresses
		var allAddressInfo = function () {
			$scope.addressFields = []
			var addressCols = [
				 {
					 field: 'address',
					 displayName: 'address'
				 },
				 {
					 field: 'class',
					 displayName: 'class'
				 },
				 {
					 field: 'phase',
					 displayName: 'phase',
					 cellClass: 'grid-align-value'
				 },
				 {
					 field: 'inproc',
					 displayName: 'in-proc'
				 },
				 {
					 field: 'local',
					 displayName: 'local',
					 cellClass: 'grid-align-value'
				 },
				 {
					 field: 'remote',
					 displayName: 'remote',
					 cellClass: 'grid-align-value'
				 },
				 {
					 field: 'in',
					 displayName: 'in',
					 cellClass: 'grid-align-value'
				 },
				 {
					 field: 'out',
					 displayName: 'out',
					 cellClass: 'grid-align-value'
				 }
			]
			$scope.selectedAddresses = []
			$scope.addressGrid = {
				data: 'addressFields',
				columnDefs: addressCols,
				enableColumnResize: true,
				multiSelect: false,
				selectedItems: $scope.selectedAddresses,
				afterSelectionChange: function(data) {
					if (data.selected) {
						var key = data.entity.uid
						// activate Routers->nodeId in the tree
						$("#overtree").dynatree("getTree").activateKey(key);

					}
	            }
			}

			var gotAllAddressFields = function ( addressFields ) {
				$scope.addressFields = 	addressFields
				$scope.$apply()
				if (currentTimer) {
					clearTimeout(currentTimer)
				}
				currentTimer = setTimeout(allAddressInfo, refreshInterval);
			}
			getAllAddressFields(gotAllAddressFields)
		}

		var getAllAddressFields = function (callback) {
			var addr_class = function (addr) {
				if (!addr) return "-"
		        if (addr[0] == 'M')  return "mobile"
		        if (addr[0] == 'R')  return "router"
		        if (addr[0] == 'A')  return "area"
		        if (addr[0] == 'L')  return "local"
		        if (addr[0] == 'C')  return "link-incoming"
		        if (addr[0] == 'D')  return "link-outgoing"
		        return "unknown: " + addr[0]
			}

			var addr_text = function (addr) {
		        if (!addr)
		            return "-"
		        if (addr[0] == 'M')
		            return addr.substring(2)
		        else
		            return addr.substring(1)
			}

			var addr_phase = function (addr) {
		        if (!addr)
		            return "-"
		        if (addr[0] == 'M')
		            return addr[1]
		        return ''
			}

			var identity_clean = function (identity) {
		        if (!identity)
		            return "-"
		        var pos = identity.indexOf('/')
		        if (pos >= 0)
		            return identity.substring(pos + 1)
		        return identity
			}

			var addressFields = []
			nodeIds = QDRService.nodeIdList()
			QDRService.getMultipleNodeInfo(nodeIds, "router.address", [], function (nodeIds, entity, response) {
				response.aggregates.forEach( function (result) {
					var prettySum = function (field) {
						var fieldIndex = response.attributeNames.indexOf(field)
						if (fieldIndex < 0) {
							return "-"
						}
						var val = result[fieldIndex].sum
						return QDRService.pretty(val)
					}

					var uid = QDRService.valFor(response.attributeNames, result, "identity").sum
					var identity = identity_clean(uid)

					addressFields.push({
						address: addr_text(identity),
						'class': addr_class(identity),
						phase:   addr_phase(identity),
						inproc:  prettySum("inProcess"),
						local:   prettySum("subscriberCount"),
						remote:  prettySum("remoteCount"),
						'in':    prettySum("deliveriesIngress"),
						out:     prettySum("deliveriesEgress"),
						thru:    prettySum("deliveriesTransit"),
						toproc:  prettySum("deliveriesToContainer"),
						fromproc:prettySum("deliveriesFromContainer"),
						uid:     uid
					})
				})
				callback(addressFields)
			}, nodeIds[0])
		}


		// get info for a all connections
		var allConnectionInfo = function () {
			$scope.allConnectionFields = []
			var allConnectionCols = [
				 {
					 field: 'host',
					 displayName: 'host'
				 },
				 {
					 field: 'container',
					 displayName: 'container'
				 },
				 {
					 field: 'role',
					 displayName: 'role'
				 },
				 {
					 field: 'dir',
					 displayName: 'dir'
				 },
				 {
					 field: 'security',
					 displayName: 'security'
				 },
				 {
					 field: 'authentication',
					 displayName: 'authentication'
				 }
			]
			var selectedConnections = []
			$scope.allConnectionGrid = {
				data: 'allConnectionFields',
				columnDefs: allConnectionCols,
				enableColumnResize: true,
				multiSelect: false,
				selectedItems: selectedConnections,
				afterSelectionChange: function(data) {
					if (data.selected) {
						var key = data.entity.host
						// activate Routers->nodeId in the tree
						$("#overtree").dynatree("getTree").activateKey(key);

					}
	            }
			}
			connections.children.forEach( function (connection) {
				$scope.allConnectionFields.push(connection.fields)
			})
			$scope.$apply()
			if (currentTimer) {
				clearTimeout(currentTimer)
				currentTimer = null
			}
		}

		// get info for a single address
		var addressInfo = function (address) {
			$scope.address = address
			$scope.addressFields = []
			var cols = [
				 {
					 field: 'attribute',
					 displayName: 'Attribute',
					 width: '40%'
				 },
				 {
					 field: 'value',
					 displayName: 'Value',
					 width: '40%'
				 }
			]
			$scope.addressGrid = {
				data: 'addressFields',
				columnDefs: cols,
				enableColumnResize: true,
				multiSelect: false,
				beforeSelectionChange: function() {
					  return false;
				}
			}

			var fields = Object.keys(address.data.fields)
			fields.forEach( function (field) {
				if (field != "title" && field != "uid")
					$scope.addressFields.push({attribute: field, value: address.data.fields[field]})
			})

			$scope.$apply()
			if (currentTimer) {
				clearTimeout(currentTimer)
				currentTimer = null
			}
		}

		// get info for a single connection
		var connectionInfo = function (connection) {
			$scope.connection = connection
			$scope.connectionFields = []
			var cols = [
				 {
					 field: 'attribute',
					 displayName: 'Attribute',
					 width: '40%'
				 },
				 {
					 field: 'value',
					 displayName: 'Value',
					 width: '40%'
				 }
			]
			$scope.connectionGrid = {
				data: 'connectionFields',
				columnDefs: cols,
				enableColumnResize: true,
				multiSelect: false,
				beforeSelectionChange: function() {
					  return false;
				}
			}

			var fields = Object.keys(connection.data.fields)
			fields.forEach( function (field) {
				$scope.connectionFields.push({attribute: field, value: connection.data.fields[field]})
			})

			$scope.$apply()
			if (currentTimer) {
				clearTimeout(currentTimer)
				currentTimer = null
			}
		}

		// get info for a all logs
		var allLogInfo = function () {
		}

		// get info for a single log
		var logInfo = function (node) {
			$scope.log = node
		}


		var activated = function (node) {
			//QDR.log.debug("node activated: " + node.data.title)
			var type = node.data.type;
			var template = $scope.templates.filter( function (tpl) {
				return tpl.name == type;
			})
			$scope.template = template[0];
			if (node.data.info)
				node.data.info(node)
			$scope.$apply();
		}
        $scope.template = $scope.templates[0];

		var routers = new Folder("Routers")
		routers.type = "Routers"
		routers.info = allRouterInfo
		routers.activate = true
		routers.key = "Routers"
		$scope.overview.children.push(routers)
		nodeIds.forEach( function (node) {
			var name = QDRService.nameFromId(node)
			var router = new Folder(name)
			router.type = "Router"
			router.info = routerInfo
			router.nodeId = node
			router.key = node
			routers.children.push(router)
		})


		var expected = nodeIds.length;
		var addresses = new Folder("Addresses")
		addresses.type = "Addresses"
		addresses.info = allAddressInfo
		addresses.key = "Addresses"
		$scope.overview.children.push(addresses)

		var gotAddressFields = function (addressFields) {
			addressFields.sort ( function (a,b) { return a.address < b.address ? -1 : a.address > b.address ? 1 : 0})
			addressFields[0].title = addressFields[0].address
			for (var i=1; i<addressFields.length; ++i) {
				if (addressFields[i].address === addressFields[i-1].address) {
					addressFields[i-1].title = addressFields[i-1].address + " (" + addressFields[i-1]['class'] + ")"
					addressFields[i].title = addressFields[i].address + " (" + addressFields[i]['class'] + ")"
				} else
					addressFields[i].title = addressFields[i].address
			}
			addressFields.forEach( function (address) {
				var a = new Folder(address.title)
				a.info = addressInfo
				a.key = address.uid
				a.fields = address
				a.type = "Address"
				addresses.children.push(a)
			} )
		}
		getAllAddressFields(gotAddressFields)


		var connreceived = 0;
		var connectionsObj = {}
		var connections = new Folder("Connections")
		connections.type = "Connections"
		connections.info = allConnectionInfo
		connections.key = "Connections"
		$scope.overview.children.push(connections)
		nodeIds.forEach( function (nodeId) {

			QDRService.getNodeInfo(nodeId, ".connection", [], function (nodeName, entity, response) {
				response.results.forEach( function (result) {

					var auth = "no_auth"
					var sasl = QDRService.valFor(response.attributeNames, result, "sasl")
					if (QDRService.valFor(response.attributeNames, result, "isAuthenticated")) {
						auth = sasl
						if (sasl === "ANONYMOUS")
							auth = "anonymous-user"
						else {
							if (sasl === "GSSAPI")
								sasl = "Kerberos"
							if (sasl === "EXTERNAL")
								sasl = "x.509"
							auth = QDRService.valFor(response.attributeNames, result, "user") + "(" +
									QDRService.valFor(response.attributeNames, result, "sslCipher") + ")"
							}
					}

					var sec = "no-security"
					if (QDRService.valFor(response.attributeNames, result, "isEncrypted")) {
						if (sasl === "GSSAPI")
							sec = "Kerberos"
						else
							sec = QDRService.valFor(response.attributeNames, result, "sslProto") + "(" +
									QDRService.valFor(response.attributeNames, result, "sslCipher") + ")"
					}

					var host = QDRService.valFor(response.attributeNames, result, "host")
					connectionsObj[host] = {}
					response.attributeNames.forEach( function (attribute, i) {
						connectionsObj[host][attribute] = result[i]
					})
					connectionsObj[host].security = sec
					connectionsObj[host].authentication = auth
				})
				++connreceived;
				if (connreceived == expected) {
					var allConnections = Object.keys(connectionsObj).sort()
					allConnections.forEach(function (connection) {
						var c = new Folder(connection)
						c.type = "Connection"
						c.info = connectionInfo
						c.key = connection
						c.fields = connectionsObj[connection]
						if (connectionsObj[connection].role === "inter-router")
							c.addClass = "icon-random"
						c.tooltip = connectionsObj[connection].role === "inter-router" ? "inter-router connection" : "external connection"
						connections.children.push(c)
					})
				}
			})
		})

		var logsreceived = 0;
		var logObj = {}
		var logs = new Folder("Logs")
		logs.type = "Logs"
		logs.info = allLogInfo
		logs.key = "Logs"
		//$scope.overview.children.push(logs)
		nodeIds.forEach( function (nodeId) {
			QDRService.getNodeInfo(nodeId, ".log", ["name"], function (nodeName, entity, response) {
				response.results.forEach( function (result) {
					logObj[result[0]] = 1    // use object to collapse duplicates
				})
				++logsreceived;
				if (logsreceived == expected) {
					var allLogs = Object.keys(logObj).sort()
					allLogs.forEach(function (log) {
						var l = new Folder(log)
						l.type = "Log"
						l.info = logInfo
						l.key = log
						logs.children.push(l)
					})
					$("#overtree").dynatree({
						onActivate: activated,
						clickFolderMode: 1,
						children: $scope.overview.children
						})
					allRouterInfo();
				}
			})
		})

        $scope.$on("$destroy", function( event ) {
			if (currentTimer) {
				clearTimeout(currentTimer)
				currentTimer = null;
			}
        });

    }

  return QDR;

}(QDR || {}));
