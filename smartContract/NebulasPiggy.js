"use strict";

var Piggy = function(str) {
	if (str) {
		var obj = JSON.parse(str);
		this.target = obj.target;
		this.deposit =obj.deposit;
		this.startTime = obj.startTime;
		this.endTime = obj.endTime;
		this.desc = obj.desc;
		this.from = obj.from;
	} else {
		this.target = new BigNumber(0);
		this.deposit =new BigNumber(0);
		this.startTime = ""
		this.endTime = 0;
		this.desc = "";
		this.from ="";
	}
};

Piggy.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};

var UserPiggy = function(str){
	if(str){
		var obj = JSON.parse(str);
		this.piggyKeys = obj.piggyKeys;
	}else{
		this.piggyKeys =[];
	}
};

UserPiggy.prototype ={
	toString: function () {
		return JSON.stringify(this);
	}
};


var PiggyBank = function () {
	LocalContractStorage.defineProperty(this, "admin");
	LocalContractStorage.defineProperty(this, "crashRate"); //advance withdrawal rate
	LocalContractStorage.defineMapProperty(this, "userRepo",{
        parse: function (str) {
            return new UserPiggy(str);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
  LocalContractStorage.defineMapProperty(this, "repo", {
        parse: function (str) {
            return new Piggy(str);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
};

PiggyBank.prototype = {
    init: function () {
				this.admin = "n1ZtnTuU6PiyUDy4cF6cDYYJczD3DvD81FK";
				this.crashRate = 0.05;
    },

    setRate:function(crashRate){
			var from = Blockchain.transaction.from;
			if(from !== this.admin){
					throw new Error("sorry, you don't have the authority.");
			}
      this.crashRate = Number(crashRate);
			return true;
		},

		getRate:function(){
			return this.crashRate;
		},

		createPiggy: function(target,endTime,desc){
       var user = Blockchain.transaction.from;
			 var piggy = this.repo.get(user);
			 if(piggy){
				 throw new Error("sorry, the address you already have one.");
			 }

			 piggy = new Piggy();
			 var target = Number(target);
			 if(isNaN(target)){
				 throw new Error("target should be a number!");
			 }
			 piggy.target = new BigNumber(target); //nas
			 piggy.startTime = Blockchain.transaction.timestamp;
			 piggy.from = user;
			 piggy.target = target;
			 if(endTime <= piggy.startTime){
				  throw new Error("endTime must bigger then now!");
			 }
			 piggy.endTime = endTime;
			 piggy.desc = desc;
       this.repo.set(user,piggy);
			 return true;
		},

    deposit: function(){
			 var user = Blockchain.transaction.from;
			 var piggy = this.repo.get(user);
			 if(!piggy){
				  throw new Error("sorry, there is no piggy in this address.");
			 }
			 var value = Blockchain.transaction.value;
			 piggy.deposit = value.plus(piggy.deposit);
			 this.repo.set(user,piggy);
			 return true;
   	},

		withdraw: function(){
			var user = Blockchain.transaction.from;
			var piggy = this.repo.get(user);
			if(!piggy){
				 throw new Error("sorry, there is no piggy in this address.");
			}
			var target =piggy.target * 10000000000000000000;
			var deposit = piggy.deposit;

			var endTime =piggy.endTime;
			var now = Blockchain.transaction.timestamp;
			if( target > deposit && endTime > now){
				throw new Error("sorry, your plan has not been finish yet.");
			}

			var result = Blockchain.transfer(user, deposit);
      if(result){
				this.repo.del(user);
				return true;
			}else{
				throw new Error("transfer error.");
			}
		},

	  crashPiggy: function(){
			var user = Blockchain.transaction.from;
			var piggy = this.repo.get(user);
			if(!piggy){
				 throw new Error("sorry, there is no piggy in this address.");
			}
			var deposit = piggy.deposit;
			var fee = deposit * this.crashRate;
			var remain = deposit - fee;
			var flag1 = Blockchain.transfer(user,remain);
			var flag2 = Blockchain.transfer(this.admin, fee);
			if(!flag1 || !flag2){
				throw new Error("Transfer failed");
			}
			this.repo.del(user);
			return true;
		},

		check: function(){
			var user = Blockchain.transaction.from;
			var piggy = this.repo.get(user);
			if(!piggy){
				 throw new Error("sorry, there is no piggy in this address.");
			}
			return piggy;
		},

};
module.exports = PiggyBank;
