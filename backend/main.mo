import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Char "mo:core/Char";
import Option "mo:core/Option";

actor {
  // ==================== Constants ====================

  let DAY_NS : Nat = 86_400_000_000_000; // Nanoseconds in a day

  // ==================== Type Definitions ====================

  type FamilyStatus = {
    #NotLinked;
    #FamilyAdmin : { familyId : Nat; memberId : Nat };
    #FamilyMember : { familyId : Nat; memberId : Nat };
  };

  type InviteDetails = {
    familyName : Text;
    memberName : Text;
    memberColor : Text;
    memberAvatarEmoji : Text;
  };

  type Family = {
    id : Nat;
    name : Text;
    adminPrincipal : Principal;
    createdAt : Time.Time;
  };

  type FamilyMember = {
    id : Nat;
    familyId : Nat;
    name : Text;
    color : Text;
    avatarEmoji : Text;
    role : Text;
    principal : ?Principal;
    inviteCode : ?Text;
    isLinked : Bool;
    createdAt : Time.Time;
  };

  type MoodEntry = {
    id : Nat;
    memberId : Nat;
    mood : Text;
    note : Text;
    date : Time.Time;
    createdAt : Time.Time;
  };

  type CalendarEvent = {
    id : Nat;
    title : Text;
    description : Text;
    startDate : Time.Time;
    endDate : Time.Time;
    memberIds : [Nat];
    eventType : Text;
    createdAt : Time.Time;
  };

  type Chore = {
    id : Nat;
    title : Text;
    description : Text;
    assignedTo : ?Nat;
    dueDate : Time.Time;
    isCompleted : Bool;
    recurrence : Text;
    createdAt : Time.Time;
  };

  type MealOption = {
    id : Nat;
    name : Text;
    description : Text;
    proposedBy : Nat;
    scheduledDate : Time.Time;
    votes : [Nat];
    isSelected : Bool;
    createdAt : Time.Time;
  };

  type ShoppingItem = {
    id : Nat;
    name : Text;
    quantity : Text;
    category : Text;
    addedBy : Nat;
    isCompleted : Bool;
    createdAt : Time.Time;
  };

  type MealAttendance = {
    date : Time.Time;
    memberId : Nat;
    attending : Bool;
  };

  type FamilyData = {
    var family : Family;
    var familyMembers : Map.Map<Nat, FamilyMember>;
    var moodEntries : Map.Map<Nat, MoodEntry>;
    var calendarEvents : Map.Map<Nat, CalendarEvent>;
    var chores : Map.Map<Nat, Chore>;
    var mealOptions : Map.Map<Nat, MealOption>;
    var shoppingItems : Map.Map<Nat, ShoppingItem>;
    var mealAttendance : Map.Map<Text, MealAttendance>;
    var nextMemberId : Nat;
    var nextMoodId : Nat;
    var nextEventId : Nat;
    var nextChoreId : Nat;
    var nextMealId : Nat;
    var nextShoppingId : Nat;
  };

  type PrincipalLink = {
    familyId : Nat;
    memberId : Nat;
  };

  type InviteCodeLink = {
    familyId : Nat;
    memberId : Nat;
  };

  type SampleData = {
    members : [FamilyMember];
    moodEntries : [MoodEntry];
    events : [CalendarEvent];
    chores : [Chore];
    mealOptions : [MealOption];
    shoppingItems : [ShoppingItem];
  };

  // ==================== Storage ====================

  var families : Map.Map<Nat, FamilyData> = Map.empty<Nat, FamilyData>();
  var principalToFamily : Map.Map<Principal, PrincipalLink> = Map.empty<Principal, PrincipalLink>();
  var inviteCodes : Map.Map<Text, InviteCodeLink> = Map.empty<Text, InviteCodeLink>();
  var nextFamilyId : Nat = 0;

  // ==================== Helper Functions ====================

  func isAuthenticated(caller : Principal) : Bool {
    not caller.isAnonymous();
  };

  func requireAuth(caller : Principal) {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Authentication required. Please log in.");
    };
  };

  func getOrTrapNat<V>(map : Map.Map<Nat, V>, key : Nat, msg : Text) : V {
    switch (map.get(key)) {
      case (null) { Runtime.trap(msg) };
      case (?v) { v };
    };
  };

  func getOrTrapText<V>(map : Map.Map<Text, V>, key : Text, msg : Text) : V {
    switch (map.get(key)) {
      case (null) { Runtime.trap(msg) };
      case (?v) { v };
    };
  };

  func getPrincipalLink(caller : Principal) : ?PrincipalLink {
    principalToFamily.get(caller);
  };

  func getFamilyData(familyId : Nat) : ?FamilyData {
    families.get(familyId);
  };

  func requireFamilyAccess(caller : Principal) : (FamilyData, PrincipalLink) {
    requireAuth(caller);
    switch (getPrincipalLink(caller)) {
      case (null) {
        Runtime.trap("You are not linked to any family. Please create or join a family first.");
      };
      case (?link) {
        switch (getFamilyData(link.familyId)) {
          case (null) { Runtime.trap("Family not found") };
          case (?data) { (data, link) };
        };
      };
    };
  };

  func isAdminMember(member : FamilyMember) : Bool {
    member.role == "admin";
  };

  func requireAdminAccess(caller : Principal) : (FamilyData, PrincipalLink) {
    let (data, link) = requireFamilyAccess(caller);
    let member = getOrTrapNat(data.familyMembers, link.memberId, "Member not found");
    if (not isAdminMember(member)) {
      Runtime.trap("Only family admin can perform this action");
    };
    (data, link);
  };

  func requireAdmin(caller : Principal) : FamilyData {
    let (data, _) = requireAdminAccess(caller);
    data;
  };

  func generateInviteCode() : Text {
    let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let timestamp = Int.abs(Time.now());
    var code = "";
    var seed = timestamp;
    var i = 0;
    while (i < 8) {
      let index = seed % 32;
      code #= Text.fromChar(chars.toArray()[index]);
      seed := (seed / 32) + (timestamp / (i + 1));
      i += 1;
    };
    let arr = code.toArray();
    Text.fromIter(Array.tabulate<Char>(4, func(i) { arr[i] }).vals()) # "-" # Text.fromIter(Array.tabulate<Char>(4, func(i) { arr[i + 4] }).vals());
  };

  func isCallerAdmin(_caller : Principal, data : FamilyData, link : PrincipalLink) : Bool {
    switch (data.familyMembers.get(link.memberId)) {
      case (null) { false };
      case (?member) { isAdminMember(member) };
    };
  };

  func requireSelfOrAdmin(callerIsAdmin : Bool, callerMemberId : Nat, targetMemberId : Nat, errorMsg : Text) {
    if (not callerIsAdmin and callerMemberId != targetMemberId) {
      Runtime.trap(errorMsg);
    };
  };

  func requireParticipantOrAdmin(callerIsAdmin : Bool, callerMemberId : Nat, memberIds : [Nat], errorMsg : Text) {
    let isParticipant = memberIds.find(func(id) { id == callerMemberId }) != null;
    if (not callerIsAdmin and not isParticipant) {
      Runtime.trap(errorMsg);
    };
  };

  func insertAndIncrement<V>(dataMap : Map.Map<Nat, V>, nextId : Nat, value : V) : (Map.Map<Nat, V>, Nat) {
    dataMap.add(nextId, value);
    (dataMap, nextId);
  };

  func filterMap<V>(map : Map.Map<Nat, V>, predicate : V -> Bool) : [V] {
    map.values().toArray().filter(predicate);
  };

  func filterTextMap<V>(map : Map.Map<Text, V>, predicate : V -> Bool) : [V] {
    map.values().toArray().filter(predicate);
  };

  // ==================== Record Update Helpers ====================

  func updateMember(m : FamilyMember, name : Text, color : Text, avatarEmoji : Text) : FamilyMember {
    {
      id = m.id;
      familyId = m.familyId;
      name;
      color;
      avatarEmoji;
      role = m.role;
      principal = m.principal;
      inviteCode = m.inviteCode;
      isLinked = m.isLinked;
      createdAt = m.createdAt;
    };
  };

  func setMemberRole(m : FamilyMember, newRole : Text) : FamilyMember {
    {
      id = m.id;
      familyId = m.familyId;
      name = m.name;
      color = m.color;
      avatarEmoji = m.avatarEmoji;
      role = newRole;
      principal = m.principal;
      inviteCode = m.inviteCode;
      isLinked = m.isLinked;
      createdAt = m.createdAt;
    };
  };

  func updateMemberInviteCode(m : FamilyMember, newCode : Text) : FamilyMember {
    {
      id = m.id;
      familyId = m.familyId;
      name = m.name;
      color = m.color;
      avatarEmoji = m.avatarEmoji;
      role = m.role;
      principal = m.principal;
      inviteCode = ?newCode;
      isLinked = m.isLinked;
      createdAt = m.createdAt;
    };
  };

  func linkMemberPrincipal(m : FamilyMember, principal : Principal) : FamilyMember {
    {
      id = m.id;
      familyId = m.familyId;
      name = m.name;
      color = m.color;
      avatarEmoji = m.avatarEmoji;
      role = m.role;
      principal = ?principal;
      inviteCode = null;
      isLinked = true;
      createdAt = m.createdAt;
    };
  };

  func applyMoodUpdate(e : MoodEntry, mood : Text, note : Text) : MoodEntry {
    {
      id = e.id;
      memberId = e.memberId;
      mood;
      note;
      date = e.date;
      createdAt = e.createdAt;
    };
  };

  func applyCalendarEventUpdate(e : CalendarEvent, title : Text, description : Text, startDate : Time.Time, endDate : Time.Time, memberIds : [Nat], eventType : Text) : CalendarEvent {
    {
      id = e.id;
      title;
      description;
      startDate;
      endDate;
      memberIds;
      eventType;
      createdAt = e.createdAt;
    };
  };

  func applyChoreUpdate(c : Chore, title : Text, description : Text, assignedTo : ?Nat, dueDate : Time.Time, recurrence : Text) : Chore {
    {
      id = c.id;
      title;
      description;
      assignedTo;
      dueDate;
      isCompleted = c.isCompleted;
      recurrence;
      createdAt = c.createdAt;
    };
  };

  func applyChoreCompletionToggle(c : Chore) : Chore {
    {
      id = c.id;
      title = c.title;
      description = c.description;
      assignedTo = c.assignedTo;
      dueDate = c.dueDate;
      isCompleted = not c.isCompleted;
      recurrence = c.recurrence;
      createdAt = c.createdAt;
    };
  };

  func updateMealVotes(m : MealOption, votes : [Nat]) : MealOption {
    {
      id = m.id;
      name = m.name;
      description = m.description;
      proposedBy = m.proposedBy;
      scheduledDate = m.scheduledDate;
      votes;
      isSelected = m.isSelected;
      createdAt = m.createdAt;
    };
  };

  func toggleMealSelected(m : MealOption) : MealOption {
    {
      id = m.id;
      name = m.name;
      description = m.description;
      proposedBy = m.proposedBy;
      scheduledDate = m.scheduledDate;
      votes = m.votes;
      isSelected = not m.isSelected;
      createdAt = m.createdAt;
    };
  };

  func applyShoppingItemUpdate(i : ShoppingItem, name : Text, quantity : Text, category : Text) : ShoppingItem {
    {
      id = i.id;
      name;
      quantity;
      category;
      addedBy = i.addedBy;
      isCompleted = i.isCompleted;
      createdAt = i.createdAt;
    };
  };

  func applyShoppingItemCompletionToggle(i : ShoppingItem) : ShoppingItem {
    {
      id = i.id;
      name = i.name;
      quantity = i.quantity;
      category = i.category;
      addedBy = i.addedBy;
      isCompleted = not i.isCompleted;
      createdAt = i.createdAt;
    };
  };

  // ==================== Sample Data Builders ====================

  func createSampleMember(data : FamilyData, name : Text, color : Text, emoji : Text) : Nat {
    let id = data.nextMemberId;
    let code = generateInviteCode();
    let member : FamilyMember = {
      id;
      familyId = data.family.id;
      name;
      color;
      avatarEmoji = emoji;
      role = "member";
      principal = null;
      inviteCode = ?code;
      isLinked = false;
      createdAt = Time.now();
    };
    data.familyMembers.add(id, member);
    inviteCodes.add(code, { familyId = data.family.id; memberId = id });
    data.nextMemberId += 1;
    id;
  };

  func createSampleMoodEntry(data : FamilyData, memberId : Nat, mood : Text, note : Text, date : Time.Time) : Nat {
    let id = data.nextMoodId;
    let entry : MoodEntry = { id; memberId; mood; note; date; createdAt = date };
    data.moodEntries.add(id, entry);
    data.nextMoodId += 1;
    id;
  };

  func createSampleEvent(data : FamilyData, title : Text, desc : Text, eventType : Text, memberIds : [Nat], daysFromNow : Nat) : Nat {
    let id = data.nextEventId;
    let now = Time.now();
    let event : CalendarEvent = {
      id;
      title;
      description = desc;
      startDate = now + (daysFromNow * DAY_NS);
      endDate = now + (daysFromNow * DAY_NS) + 3600000000000;
      memberIds;
      eventType;
      createdAt = now;
    };
    data.calendarEvents.add(id, event);
    data.nextEventId += 1;
    id;
  };

  func createSampleChore(data : FamilyData, title : Text, desc : Text, assignedTo : ?Nat, recurrence : Text, daysFromNow : Nat, isCompleted : Bool) : Nat {
    let id = data.nextChoreId;
    let now = Time.now();
    let chore : Chore = {
      id;
      title;
      description = desc;
      assignedTo;
      dueDate = now + (daysFromNow * DAY_NS);
      isCompleted;
      recurrence;
      createdAt = now;
    };
    data.chores.add(id, chore);
    data.nextChoreId += 1;
    id;
  };

  func createSampleMeal(data : FamilyData, name : Text, desc : Text, proposedBy : Nat, daysFromNow : Nat, votes : [Nat], isSelected : Bool) : Nat {
    let id = data.nextMealId;
    let now = Time.now();
    let meal : MealOption = {
      id;
      name;
      description = desc;
      proposedBy;
      scheduledDate = now + (daysFromNow * DAY_NS);
      votes;
      isSelected;
      createdAt = now;
    };
    data.mealOptions.add(id, meal);
    data.nextMealId += 1;
    id;
  };

  func createSampleShoppingItem(data : FamilyData, name : Text, qty : Text, category : Text, addedBy : Nat, isCompleted : Bool) : Nat {
    let id = data.nextShoppingId;
    let now = Time.now();
    let item : ShoppingItem = {
      id;
      name;
      quantity = qty;
      category;
      addedBy;
      isCompleted;
      createdAt = now;
    };
    data.shoppingItems.add(id, item);
    data.nextShoppingId += 1;
    id;
  };

  // ==================== Multi-User Authentication ====================

  public query ({ caller }) func getMyFamilyStatus() : async FamilyStatus {
    if (not isAuthenticated(caller)) { return #NotLinked };
    switch (getPrincipalLink(caller)) {
      case (null) { #NotLinked };
      case (?link) {
        switch (getFamilyData(link.familyId)) {
          case (null) { #NotLinked };
          case (?data) {
            let member = switch (data.familyMembers.get(link.memberId)) {
              case (null) { return #NotLinked };
              case (?m) { m };
            };
            if (isAdminMember(member)) {
              #FamilyAdmin({
                familyId = link.familyId;
                memberId = link.memberId;
              });
            } else {
              #FamilyMember({
                familyId = link.familyId;
                memberId = link.memberId;
              });
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func createFamily(familyName : Text, adminName : Text, adminColor : Text, adminAvatarEmoji : Text) : async {
    familyId : Nat;
    memberId : Nat;
  } {
    requireAuth(caller);
    if (getPrincipalLink(caller) != null) {
      Runtime.trap("You are already part of a family");
    };
    let familyId = nextFamilyId;
    nextFamilyId += 1;
    let family : Family = {
      id = familyId;
      name = familyName;
      adminPrincipal = caller;
      createdAt = Time.now();
    };
    let adminMember : FamilyMember = {
      id = 0;
      familyId;
      name = adminName;
      color = adminColor;
      avatarEmoji = adminAvatarEmoji;
      role = "admin";
      principal = ?caller;
      inviteCode = null;
      isLinked = true;
      createdAt = Time.now();
    };
    var memberMap = Map.empty<Nat, FamilyMember>();
    memberMap.add(0, adminMember);
    let familyData : FamilyData = {
      var family = family;
      var familyMembers = memberMap;
      var moodEntries = Map.empty<Nat, MoodEntry>();
      var calendarEvents = Map.empty<Nat, CalendarEvent>();
      var chores = Map.empty<Nat, Chore>();
      var mealOptions = Map.empty<Nat, MealOption>();
      var shoppingItems = Map.empty<Nat, ShoppingItem>();
      var mealAttendance = Map.empty<Text, MealAttendance>();
      var nextMemberId = 1;
      var nextMoodId = 0;
      var nextEventId = 0;
      var nextChoreId = 0;
      var nextMealId = 0;
      var nextShoppingId = 0;
    };
    families.add(familyId, familyData);
    principalToFamily.add(caller, { familyId; memberId = 0 });
    { familyId; memberId = 0 };
  };

  public query func getInviteDetails(code : Text) : async InviteDetails {
    let link = getOrTrapText(inviteCodes, code, "Invalid invite code");
    let data = switch (getFamilyData(link.familyId)) {
      case (null) { Runtime.trap("Family not found") };
      case (?d) { d };
    };
    let member = getOrTrapNat(data.familyMembers, link.memberId, "Member not found");
    {
      familyName = data.family.name;
      memberName = member.name;
      memberColor = member.color;
      memberAvatarEmoji = member.avatarEmoji;
    };
  };

  public shared ({ caller }) func joinFamilyWithCode(inviteCode : Text) : async {
    familyId : Nat;
    memberId : Nat;
  } {
    requireAuth(caller);
    if (getPrincipalLink(caller) != null) {
      Runtime.trap("You are already part of a family");
    };
    let link = getOrTrapText(inviteCodes, inviteCode, "Invalid invite code");
    let data = switch (getFamilyData(link.familyId)) {
      case (null) { Runtime.trap("Family not found") };
      case (?d) { d };
    };
    let member = getOrTrapNat(data.familyMembers, link.memberId, "Member not found");
    if (member.isLinked) {
      Runtime.trap("This invite code has already been used");
    };
    let updatedMember = linkMemberPrincipal(member, caller);
    data.familyMembers.add(member.id, updatedMember);
    principalToFamily.add(caller, { familyId = link.familyId; memberId = link.memberId });
    inviteCodes.remove(inviteCode);
    { familyId = link.familyId; memberId = link.memberId };
  };

  public query ({ caller }) func getMyFamily() : async Family {
    let (data, _) = requireFamilyAccess(caller);
    data.family;
  };

  public query ({ caller }) func getMyMember() : async FamilyMember {
    let (data, link) = requireFamilyAccess(caller);
    getOrTrapNat(data.familyMembers, link.memberId, "Member not found");
  };

  public query ({ caller }) func isAdmin() : async Bool {
    if (not isAuthenticated(caller)) { return false };
    switch (getPrincipalLink(caller)) {
      case (null) { false };
      case (?link) {
        switch (getFamilyData(link.familyId)) {
          case (null) { false };
          case (?data) {
            switch (data.familyMembers.get(link.memberId)) {
              case (null) { false };
              case (?member) { isAdminMember(member) };
            };
          };
        };
      };
    };
  };

  // ==================== Family Member Operations ====================

  public shared ({ caller }) func addFamilyMemberWithInvite(name : Text, color : Text, avatarEmoji : Text) : async {
    memberId : Nat;
    inviteCode : Text;
  } {
    let data = requireAdmin(caller);
    let code = generateInviteCode();
    let memberId = data.nextMemberId;
    let member : FamilyMember = {
      id = memberId;
      familyId = data.family.id;
      name;
      color;
      avatarEmoji;
      role = "member";
      principal = null;
      inviteCode = ?code;
      isLinked = false;
      createdAt = Time.now();
    };
    data.familyMembers.add(memberId, member);
    data.nextMemberId += 1;
    inviteCodes.add(code, { familyId = data.family.id; memberId });
    { memberId; inviteCode = code };
  };

  public shared ({ caller }) func regenerateInviteCode(memberId : Nat) : async Text {
    let data = requireAdmin(caller);
    let member = getOrTrapNat(data.familyMembers, memberId, "Family member not found");
    if (member.isLinked) {
      Runtime.trap("Cannot regenerate invite code for linked member");
    };
    if (isAdminMember(member)) {
      Runtime.trap("Admin does not need an invite code");
    };
    switch (member.inviteCode) {
      case (?oldCode) { inviteCodes.remove(oldCode) };
      case (null) {};
    };
    let newCode = generateInviteCode();
    let updated = updateMemberInviteCode(member, newCode);
    data.familyMembers.add(memberId, updated);
    inviteCodes.add(newCode, { familyId = data.family.id; memberId });
    newCode;
  };

  public query ({ caller }) func getAllFamilyMembers() : async [FamilyMember] {
    let (data, _) = requireFamilyAccess(caller);
    data.familyMembers.values().toArray();
  };

  public query ({ caller }) func getFamilyMember(id : Nat) : async ?FamilyMember {
    let (data, _) = requireFamilyAccess(caller);
    data.familyMembers.get(id);
  };

  public shared ({ caller }) func updateFamilyMember(id : Nat, name : Text, color : Text, avatarEmoji : Text) : async FamilyMember {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    let existing = getOrTrapNat(data.familyMembers, id, "Family member not found");
    requireSelfOrAdmin(callerIsAdmin, link.memberId, id, "You can only update your own profile");
    let updated = updateMember(existing, name, color, avatarEmoji);
    data.familyMembers.add(id, updated);
    updated;
  };

  public shared ({ caller }) func updateMemberRole(id : Nat, newRole : Text) : async FamilyMember {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    if (not callerIsAdmin) {
      Runtime.trap("Only admins can change member roles");
    };
    if (link.memberId == id and newRole == "member") {
      Runtime.trap("You cannot demote yourself");
    };
    let existing = getOrTrapNat(data.familyMembers, id, "Family member not found");
    let updated = setMemberRole(existing, newRole);
    data.familyMembers.add(id, updated);
    updated;
  };

  public shared ({ caller }) func deleteFamilyMember(id : Nat) : async Bool {
    let data = requireAdmin(caller);
    let member = getOrTrapNat(data.familyMembers, id, "Family member not found");
    if (isAdminMember(member)) {
      Runtime.trap("Cannot delete the family admin");
    };
    switch (member.principal) {
      case (?p) { principalToFamily.remove(p) };
      case (null) {};
    };
    switch (member.inviteCode) {
      case (?code) { inviteCodes.remove(code) };
      case (null) {};
    };
    data.familyMembers.remove(id);
    true;
  };

  // ==================== Mood Entry Operations ====================

  public shared ({ caller }) func addMoodEntry(memberId : Nat, mood : Text, note : Text, date : Time.Time) : async Nat {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    requireSelfOrAdmin(callerIsAdmin, link.memberId, memberId, "You can only log your own mood");
    if (not data.familyMembers.containsKey(memberId)) {
      Runtime.trap("Family member not found");
    };
    let entry : MoodEntry = {
      id = data.nextMoodId;
      memberId;
      mood;
      note;
      date;
      createdAt = Time.now();
    };
    let (newMap, moodId) = insertAndIncrement(data.moodEntries, data.nextMoodId, entry);
    data.moodEntries := newMap;
    data.nextMoodId += 1;
    moodId;
  };

  public query ({ caller }) func getAllMoodEntries() : async [MoodEntry] {
    let (data, _) = requireFamilyAccess(caller);
    data.moodEntries.values().toArray();
  };

  public query ({ caller }) func getMoodEntriesByMember(memberId : Nat) : async [MoodEntry] {
    let (data, _) = requireFamilyAccess(caller);
    filterMap(data.moodEntries, func(e) { e.memberId == memberId });
  };

  public query ({ caller }) func getMoodEntriesByDateRange(startDate : Time.Time, endDate : Time.Time) : async [MoodEntry] {
    let (data, _) = requireFamilyAccess(caller);
    filterMap(data.moodEntries, func(e) { e.date >= startDate and e.date <= endDate });
  };

  public shared ({ caller }) func updateMoodEntry(id : Nat, mood : Text, note : Text) : async MoodEntry {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    let existing = getOrTrapNat(data.moodEntries, id, "Mood entry not found");
    requireSelfOrAdmin(callerIsAdmin, link.memberId, existing.memberId, "You can only update your own mood entries");
    let updated = applyMoodUpdate(existing, mood, note);
    data.moodEntries.add(id, updated);
    updated;
  };

  public shared ({ caller }) func deleteMoodEntry(id : Nat) : async Bool {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    let existing = getOrTrapNat(data.moodEntries, id, "Mood entry not found");
    requireSelfOrAdmin(callerIsAdmin, link.memberId, existing.memberId, "You can only delete your own mood entries");
    data.moodEntries.remove(id);
    true;
  };

  // ==================== Calendar Event Operations ====================

  public shared ({ caller }) func addCalendarEvent(title : Text, description : Text, startDate : Time.Time, endDate : Time.Time, memberIds : [Nat], eventType : Text) : async Nat {
    let (data, _) = requireFamilyAccess(caller);
    let event : CalendarEvent = {
      id = data.nextEventId;
      title;
      description;
      startDate;
      endDate;
      memberIds;
      eventType;
      createdAt = Time.now();
    };
    let (newMap, eventId) = insertAndIncrement(data.calendarEvents, data.nextEventId, event);
    data.calendarEvents := newMap;
    data.nextEventId += 1;
    eventId;
  };

  public query ({ caller }) func getAllCalendarEvents() : async [CalendarEvent] {
    let (data, _) = requireFamilyAccess(caller);
    data.calendarEvents.values().toArray();
  };

  public query ({ caller }) func getCalendarEventsByDateRange(startDate : Time.Time, endDate : Time.Time) : async [CalendarEvent] {
    let (data, _) = requireFamilyAccess(caller);
    filterMap(data.calendarEvents, func(e) { e.startDate >= startDate and e.startDate <= endDate });
  };

  public query ({ caller }) func getCalendarEventsByMember(memberId : Nat) : async [CalendarEvent] {
    let (data, _) = requireFamilyAccess(caller);
    filterMap(data.calendarEvents, func(e) { e.memberIds.find(func(id) { id == memberId }) != null });
  };

  public shared ({ caller }) func updateCalendarEvent(id : Nat, title : Text, description : Text, startDate : Time.Time, endDate : Time.Time, memberIds : [Nat], eventType : Text) : async CalendarEvent {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    let existing = getOrTrapNat(data.calendarEvents, id, "Calendar event not found");
    requireParticipantOrAdmin(callerIsAdmin, link.memberId, existing.memberIds, "You can only update events you are participating in");
    let updated = applyCalendarEventUpdate(existing, title, description, startDate, endDate, memberIds, eventType);
    data.calendarEvents.add(id, updated);
    updated;
  };

  public shared ({ caller }) func deleteCalendarEvent(id : Nat) : async Bool {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    let existing = getOrTrapNat(data.calendarEvents, id, "Calendar event not found");
    requireParticipantOrAdmin(callerIsAdmin, link.memberId, existing.memberIds, "You can only delete events you are participating in");
    data.calendarEvents.remove(id);
    true;
  };

  // ==================== Chore Operations ====================

  public shared ({ caller }) func addChore(title : Text, description : Text, assignedTo : ?Nat, dueDate : Time.Time, recurrence : Text) : async Nat {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);

    // Non-admins can only create chores assigned to themselves
    let finalAssignedTo = if (callerIsAdmin) { assignedTo } else {
      ?link.memberId;
    };

    let chore : Chore = {
      id = data.nextChoreId;
      title;
      description;
      assignedTo = finalAssignedTo;
      dueDate;
      isCompleted = false;
      recurrence;
      createdAt = Time.now();
    };
    let (newMap, choreId) = insertAndIncrement(data.chores, data.nextChoreId, chore);
    data.chores := newMap;
    data.nextChoreId += 1;
    choreId;
  };

  public query ({ caller }) func getAllChores() : async [Chore] {
    let (data, _) = requireFamilyAccess(caller);
    data.chores.values().toArray();
  };

  public query ({ caller }) func getChoresByMember(memberId : Nat) : async [Chore] {
    let (data, _) = requireFamilyAccess(caller);
    filterMap(
      data.chores,
      func(c) {
        switch (c.assignedTo) {
          case (?id) { id == memberId };
          case (null) { false };
        };
      },
    );
  };

  public shared ({ caller }) func updateChore(id : Nat, title : Text, description : Text, assignedTo : ?Nat, dueDate : Time.Time, recurrence : Text) : async Chore {
    let data = requireAdmin(caller);
    let existing = getOrTrapNat(data.chores, id, "Chore not found");
    let updated = applyChoreUpdate(existing, title, description, assignedTo, dueDate, recurrence);
    data.chores.add(id, updated);
    updated;
  };

  public shared ({ caller }) func toggleChoreComplete(id : Nat) : async Chore {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    let existing = getOrTrapNat(data.chores, id, "Chore not found");
    if (not callerIsAdmin) {
      switch (existing.assignedTo) {
        case (null) {
          Runtime.trap("Only admin can complete unassigned chores");
        };
        case (?assignedId) {
          if (assignedId != link.memberId) {
            Runtime.trap("You can only complete your own assigned chores");
          };
        };
      };
    };
    let updated = applyChoreCompletionToggle(existing);
    data.chores.add(id, updated);
    updated;
  };

  public shared ({ caller }) func deleteChore(id : Nat) : async Bool {
    let data = requireAdmin(caller);
    if (not data.chores.containsKey(id)) { Runtime.trap("Chore not found") };
    data.chores.remove(id);
    true;
  };

  // ==================== Meal Voting Operations ====================

  public shared ({ caller }) func addMealOption(name : Text, description : Text, proposedBy : Nat, scheduledDate : Time.Time) : async Nat {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    // Non-admins can only propose meals as themselves
    let finalProposedBy = if (callerIsAdmin) { proposedBy } else {
      link.memberId;
    };
    if (not data.familyMembers.containsKey(finalProposedBy)) {
      Runtime.trap("Family member not found");
    };
    let meal : MealOption = {
      id = data.nextMealId;
      name;
      description;
      proposedBy = finalProposedBy;
      scheduledDate;
      votes = [];
      isSelected = false;
      createdAt = Time.now();
    };
    let (newMap, mealId) = insertAndIncrement(data.mealOptions, data.nextMealId, meal);
    data.mealOptions := newMap;
    data.nextMealId += 1;
    mealId;
  };

  public query ({ caller }) func getAllMealOptions() : async [MealOption] {
    let (data, _) = requireFamilyAccess(caller);
    data.mealOptions.values().toArray();
  };

  public query ({ caller }) func getMealOptionsByDate(date : Time.Time) : async [MealOption] {
    let (data, _) = requireFamilyAccess(caller);
    let dayStart = (date / DAY_NS) * DAY_NS;
    let dayEnd = dayStart + DAY_NS;
    filterMap(data.mealOptions, func(m) { m.scheduledDate >= dayStart and m.scheduledDate < dayEnd });
  };

  public shared ({ caller }) func voteForMeal(mealId : Nat, memberId : Nat) : async MealOption {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    requireSelfOrAdmin(callerIsAdmin, link.memberId, memberId, "You can only vote as yourself");
    let existing = getOrTrapNat(data.mealOptions, mealId, "Meal option not found");
    let hasVoted = existing.votes.find(func(id) { id == memberId }) != null;
    let newVotes = if (hasVoted) {
      existing.votes.filter(func(id) { id != memberId });
    } else {
      [existing.votes, [memberId]].flatten();
    };
    let updated = updateMealVotes(existing, newVotes);
    data.mealOptions.add(mealId, updated);
    updated;
  };

  public shared ({ caller }) func selectMeal(mealId : Nat) : async MealOption {
    let data = requireAdmin(caller);
    let existing = getOrTrapNat(data.mealOptions, mealId, "Meal option not found");
    let updated = toggleMealSelected(existing);
    data.mealOptions.add(mealId, updated);
    updated;
  };

  public shared ({ caller }) func deleteMealOption(id : Nat) : async Bool {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    let existing = getOrTrapNat(data.mealOptions, id, "Meal option not found");
    requireSelfOrAdmin(callerIsAdmin, link.memberId, existing.proposedBy, "You can only delete meal options you proposed");
    data.mealOptions.remove(id);
    true;
  };

  func normalizeDateToDay(date : Time.Time) : Time.Time {
    (date / DAY_NS) * DAY_NS;
  };

  func makeAttendanceKey(date : Time.Time, memberId : Nat) : Text {
    let normalizedDate = normalizeDateToDay(date);
    normalizedDate.toText() # "-" # memberId.toText();
  };

  public shared ({ caller }) func setMealAttendance(date : Time.Time, memberId : Nat, attending : Bool) : async MealAttendance {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    requireSelfOrAdmin(callerIsAdmin, link.memberId, memberId, "You can only set your own attendance");
    if (not data.familyMembers.containsKey(memberId)) {
      Runtime.trap("Family member not found");
    };
    let normalizedDate = normalizeDateToDay(date);
    let key = makeAttendanceKey(normalizedDate, memberId);
    let attendance : MealAttendance = {
      date = normalizedDate;
      memberId;
      attending;
    };
    data.mealAttendance.add(key, attendance);
    attendance;
  };

  public query ({ caller }) func getMealAttendanceForDate(date : Time.Time) : async [MealAttendance] {
    let (data, _) = requireFamilyAccess(caller);
    let normalizedDate = normalizeDateToDay(date);
    filterTextMap(data.mealAttendance, func(a) { a.date == normalizedDate });
  };

  public query ({ caller }) func getMemberAttendance(date : Time.Time, memberId : Nat) : async ?MealAttendance {
    let (data, _) = requireFamilyAccess(caller);
    let key = makeAttendanceKey(date, memberId);
    data.mealAttendance.get(key);
  };

  // ==================== Shopping List Operations ====================

  public shared ({ caller }) func addShoppingItem(name : Text, quantity : Text, category : Text, addedBy : Nat) : async Nat {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    // Non-admins can only add items as themselves
    let finalAddedBy = if (callerIsAdmin) { addedBy } else { link.memberId };
    if (not data.familyMembers.containsKey(finalAddedBy)) {
      Runtime.trap("Family member not found");
    };
    let item : ShoppingItem = {
      id = data.nextShoppingId;
      name;
      quantity;
      category;
      addedBy = finalAddedBy;
      isCompleted = false;
      createdAt = Time.now();
    };
    let (newMap, itemId) = insertAndIncrement(data.shoppingItems, data.nextShoppingId, item);
    data.shoppingItems := newMap;
    data.nextShoppingId += 1;
    itemId;
  };

  public query ({ caller }) func getAllShoppingItems() : async [ShoppingItem] {
    let (data, _) = requireFamilyAccess(caller);
    data.shoppingItems.values().toArray();
  };

  public query ({ caller }) func getShoppingItemsByCategory(category : Text) : async [ShoppingItem] {
    let (data, _) = requireFamilyAccess(caller);
    filterMap(data.shoppingItems, func(i) { i.category == category });
  };

  public shared ({ caller }) func updateShoppingItem(id : Nat, name : Text, quantity : Text, category : Text) : async ShoppingItem {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    let existing = getOrTrapNat(data.shoppingItems, id, "Shopping item not found");
    requireSelfOrAdmin(callerIsAdmin, link.memberId, existing.addedBy, "You can only update shopping items you added");
    let updated = applyShoppingItemUpdate(existing, name, quantity, category);
    data.shoppingItems.add(id, updated);
    updated;
  };

  public shared ({ caller }) func toggleShoppingItemComplete(id : Nat) : async ShoppingItem {
    let (data, _) = requireFamilyAccess(caller);
    let existing = getOrTrapNat(data.shoppingItems, id, "Shopping item not found");
    let updated = applyShoppingItemCompletionToggle(existing);
    data.shoppingItems.add(id, updated);
    updated;
  };

  public shared ({ caller }) func deleteShoppingItem(id : Nat) : async Bool {
    let (data, link) = requireFamilyAccess(caller);
    let callerIsAdmin = isCallerAdmin(caller, data, link);
    let existing = getOrTrapNat(data.shoppingItems, id, "Shopping item not found");
    requireSelfOrAdmin(callerIsAdmin, link.memberId, existing.addedBy, "You can only delete shopping items you added");
    data.shoppingItems.remove(id);
    true;
  };

  public shared ({ caller }) func clearCompletedShoppingItems() : async Nat {
    let (data, _) = requireFamilyAccess(caller);
    let all = data.shoppingItems.values().toArray();
    var clearedCount = 0;
    for (item in all.vals()) {
      if (item.isCompleted) {
        data.shoppingItems.remove(item.id);
        clearedCount += 1;
      };
    };
    clearedCount;
  };

  // ==================== Utility Operations ====================

  public query ({ caller }) func getDataCounts() : async {
    members : Nat;
    moodEntries : Nat;
    events : Nat;
    chores : Nat;
    meals : Nat;
    shoppingItems : Nat;
  } {
    let (data, _) = requireFamilyAccess(caller);
    {
      members = data.familyMembers.size();
      moodEntries = data.moodEntries.size();
      events = data.calendarEvents.size();
      chores = data.chores.size();
      meals = data.mealOptions.size();
      shoppingItems = data.shoppingItems.size();
    };
  };

  public shared ({ caller }) func clearAllData() : async Bool {
    let data = requireAdmin(caller);
    let adminMember = getOrTrapNat(data.familyMembers, 0, "Admin member not found");
    var newMemberMap = Map.empty<Nat, FamilyMember>();
    newMemberMap.add(0, adminMember);
    data.familyMembers := newMemberMap;
    data.moodEntries := Map.empty<Nat, MoodEntry>();
    data.calendarEvents := Map.empty<Nat, CalendarEvent>();
    data.chores := Map.empty<Nat, Chore>();
    data.mealOptions := Map.empty<Nat, MealOption>();
    data.shoppingItems := Map.empty<Nat, ShoppingItem>();
    data.mealAttendance := Map.empty<Text, MealAttendance>();
    data.nextMemberId := 1;
    data.nextMoodId := 0;
    data.nextEventId := 0;
    data.nextChoreId := 0;
    data.nextMealId := 0;
    data.nextShoppingId := 0;
    true;
  };

  public shared ({ caller }) func generateSampleData() : async SampleData {
    let data = requireAdmin(caller);
    if (not data.familyMembers.containsKey(0)) {
      Runtime.trap("Admin member not found");
    };

    let memberData = [("Mom", "#EC4899", "👩"), ("Emma", "#8B5CF6", "👧"), ("Jack", "#10B981", "👦")];
    var memberIds : [Nat] = [0];

    for ((name, color, emoji) in memberData.vals()) {
      let id = createSampleMember(data, name, color, emoji);
      memberIds := [memberIds, [id]].flatten();
    };

    let moods = ["😊", "😢", "😡", "😴", "🤩", "😐"];
    let now = Time.now();

    var i = 0;
    while (i < 20) {
      let memberId = memberIds[i % memberIds.size()];
      let mood = moods[i % moods.size()];
      let daysAgo = i / 4;
      let note = if (i % 3 == 0) { "Feeling good today!" } else { "" };
      ignore createSampleMoodEntry(data, memberId, mood, note, now - (daysAgo * DAY_NS));
      i += 1;
    };

    let eventData = [
      ("Soccer Practice", "Emma's weekly soccer", "activity", [0, 1, 2, 3]),
      ("Dentist Appointment", "Annual checkup for Jack", "appointment", [0, 3]),
      ("Family Movie Night", "Watch a movie together", "activity", [0, 1, 2, 3]),
      ("Parent-Teacher Meeting", "Emma's school", "appointment", [0, 1]),
      ("Birthday Party", "Jack's friend's party", "birthday", [0, 3]),
      ("Grocery Shopping", "Weekly groceries", "reminder", [0, 1]),
      ("Piano Lesson", "Emma's piano class", "activity", [0, 2]),
      ("Date Night", "Parents' night out", "activity", [0, 1]),
    ];

    for ((title, desc, eventType, memberIdxs) in eventData.vals()) {
      let eventMemberIds = memberIdxs.map(func(idx) { memberIds[idx] });
      ignore createSampleEvent(data, title, desc, eventType, eventMemberIds, memberIdxs.size() * 2);
    };

    let choreData = [
      ("Take out trash", "Weekly trash duty", ?0, "weekly"),
      ("Do dishes", "After dinner dishes", ?1, "daily"),
      ("Clean room", "Tidy up bedroom", ?2, "weekly"),
      ("Feed pets", "Morning and evening", ?3, "daily"),
      ("Vacuum living room", "Weekly cleaning", ?0, "weekly"),
      ("Water plants", "Every other day", ?1, "none"),
    ];

    var k = 0;
    for ((title, desc, assignedIdx, recurrence) in choreData.vals()) {
      let assignedTo = assignedIdx.map(func(idx) { memberIds[idx] });
      ignore createSampleChore(data, title, desc, assignedTo, recurrence, k % 7, k % 3 == 0);
      k += 1;
    };

    let mealData = [
      ("Spaghetti Bolognese", "Classic Italian pasta", 0),
      ("Tacos", "Mexican night with all the toppings", 1),
      ("Grilled Chicken", "With roasted vegetables", 0),
      ("Pizza", "Homemade pizza night", 2),
      ("Stir Fry", "Quick and healthy", 1),
    ];

    var m = 0;
    for ((name, desc, proposerIdx) in mealData.vals()) {
      let votes = if (m % 2 == 0) { [memberIds[0], memberIds[1]] } else {
        [memberIds[2]];
      };
      ignore createSampleMeal(data, name, desc, memberIds[proposerIdx], m, votes, m == 0);
      m += 1;
    };

    let shoppingData = [
      ("Milk", "1 gallon", "Dairy", 0),
      ("Bread", "2 loaves", "Bakery", 1),
      ("Apples", "6 pack", "Produce", 2),
      ("Chicken breast", "2 lbs", "Meat", 0),
      ("Pasta", "2 boxes", "Pantry", 1),
      ("Tomato sauce", "3 jars", "Pantry", 1),
      ("Eggs", "1 dozen", "Dairy", 0),
      ("Orange juice", "1 carton", "Beverages", 3),
    ];

    var n = 0;
    for ((name, qty, category, adderIdx) in shoppingData.vals()) {
      ignore createSampleShoppingItem(data, name, qty, category, memberIds[adderIdx], n % 4 == 0);
      n += 1;
    };

    {
      members = data.familyMembers.values().toArray();
      moodEntries = data.moodEntries.values().toArray();
      events = data.calendarEvents.values().toArray();
      chores = data.chores.values().toArray();
      mealOptions = data.mealOptions.values().toArray();
      shoppingItems = data.shoppingItems.values().toArray();
    };
  };
};
