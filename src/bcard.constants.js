//Suits, we keep it nice and  clean for coders
var IR = 0; //Hearts
var IN = 1; //Spades
var RO = 2; // Diamonds
var TR = 3; //CLUBS

//special cards
var J = 12; //jack
var Q = 13; //queen
var K = 14; //king
var A = 15; //ace is the biggest, can be set on 1 or 11

//different status of the game, must be the same of server and client side.
var STATUS_OFFLINE = 0; /**put the server offline */
var STATUS_DEBUG = 1; /**only for specific users, for everyone else is OFFLINE  */
var STATUS_WAIT_PLAYER = 2; /**wait for a player to enter the table*/
var STATUS_WAIT_GAME = 3; /**wait for current player to hit Start Game     */
var STATUS_WAIT_CONTRACT = 4; /**wait for current player to choose a contract   */
var STATUS_WAIT_HAND = 5;/**wait for current player to throw a card    */
var STATUS_FINISHED = 10; /** game over */

var ERROR_HACK = -99;
var ERROR_NOT_ALLOWED = -98;

