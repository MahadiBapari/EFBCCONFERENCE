import { Request, Response } from 'express';
import { Group } from '../models/Group';
import { ApiResponse, CreateGroupRequest, UpdateGroupRequest, GroupQuery } from '../types';
import { DatabaseService } from '../services/databaseService';

export class GroupController {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // Get all groups
  async getGroups(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, eventId, category, search } = req.query as GroupQuery;
      const offset = (Number(page) - 1) * Number(limit);

      let conditions: Record<string, any> = {};
      if (eventId) conditions.eventId = eventId;
      if (category) conditions.category = category;

      let groups;
      let total;

      if (search) {
        const searchCondition = `name LIKE '%${search}%'`;
        let whereClause = searchCondition;
        
        if (Object.keys(conditions).length > 0) {
          const conditionClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
          whereClause = `${conditionClause} AND ${searchCondition}`;
        }

        groups = await this.db.query(
          `SELECT * FROM \`activity_groups\` WHERE ${whereClause} LIMIT ? OFFSET ?`,
          [...Object.values(conditions), Number(limit), offset]
        );
        
        total = await this.db.query(
          `SELECT COUNT(*) as count FROM \`activity_groups\` WHERE ${whereClause}`,
          Object.values(conditions)
        );
      } else {
        groups = await this.db.findAll('activity_groups', conditions, Number(limit), offset);
        total = await this.db.count('activity_groups', conditions);
      }

      const response: ApiResponse = {
        success: true,
        data: groups.map((row: any) => Group.fromDatabase(row).toJSON()),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Array.isArray(total) ? total[0].count : total,
          totalPages: Math.ceil((Array.isArray(total) ? total[0].count : total) / Number(limit))
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching groups:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch groups'
      };
      res.status(500).json(response);
    }
  }

  // Get group by ID
  async getGroupById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const group = await this.db.findById('activity_groups', Number(id));

      if (!group) {
        const response: ApiResponse = {
          success: false,
          error: 'Group not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: Group.fromDatabase(group).toJSON()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching group:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch group'
      };
      res.status(500).json(response);
    }
  }

  // Create new group
  async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupData: CreateGroupRequest = req.body;
      const group = new Group(groupData);
      
      const result = await this.db.insert('activity_groups', group.toDatabase());
      group.id = result.insertId;

      const response: ApiResponse = {
        success: true,
        data: group.toJSON(),
        message: 'Group created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating group:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to create group'
      };
      res.status(500).json(response);
    }
  }

  // Update group
  async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateGroupRequest = req.body;
      
      const existingGroup = await this.db.findById('activity_groups', Number(id));
      if (!existingGroup) {
        const response: ApiResponse = {
          success: false,
          error: 'Group not found'
        };
        res.status(404).json(response);
        return;
      }

      const oldGroup = Group.fromDatabase(existingGroup);
      const oldMemberIds = oldGroup.members || [];
      
      const group = new Group({ ...existingGroup, ...updateData });
      group.updatedAt = new Date().toISOString();
      const newMemberIds = group.members || [];
      
      await this.db.update('activity_groups', Number(id), group.toDatabase());

      // Update group_assigned in registrations table
      // Remove group_assigned for members no longer in the group
      const removedMembers = oldMemberIds.filter((mid: number) => !newMemberIds.includes(mid));
      if (removedMembers.length > 0) {
        const placeholders = removedMembers.map(() => '?').join(',');
        await this.db.query(
          `UPDATE \`registrations\` SET \`group_assigned\` = NULL WHERE \`id\` IN (${placeholders})`,
          removedMembers
        );
      }
      
      // Set group_assigned for new members
      const addedMembers = newMemberIds.filter((mid: number) => !oldMemberIds.includes(mid));
      if (addedMembers.length > 0) {
        const placeholders = addedMembers.map(() => '?').join(',');
        await this.db.query(
          `UPDATE \`registrations\` SET \`group_assigned\` = ? WHERE \`id\` IN (${placeholders})`,
          [Number(id), ...addedMembers]
        );
      }

      const response: ApiResponse = {
        success: true,
        data: group.toJSON(),
        message: 'Group updated successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating group:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to update group'
      };
      res.status(500).json(response);
    }
  }

  // Delete group
  async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingGroup = await this.db.findById('activity_groups', Number(id));
      if (!existingGroup) {
        const response: ApiResponse = {
          success: false,
          error: 'Group not found'
        };
        res.status(404).json(response);
        return;
      }

      // Get all members before deleting the group
      const groupModel = Group.fromDatabase(existingGroup);
      const memberIds = groupModel.members || [];

      await this.db.delete('activity_groups', Number(id));

      // Clear group_assigned for all members of this group
      if (memberIds.length > 0) {
        const placeholders = memberIds.map(() => '?').join(',');
        await this.db.query(
          `UPDATE \`registrations\` SET \`group_assigned\` = NULL WHERE \`id\` IN (${placeholders})`,
          memberIds
        );
      }

      const response: ApiResponse = {
        success: true,
        message: 'Group deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting group:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete group'
      };
      res.status(500).json(response);
    }
  }

  // Add member to group
  async addMemberToGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { memberId } = req.body;
      
      const group = await this.db.findById('activity_groups', Number(id));
      if (!group) {
        const response: ApiResponse = {
          success: false,
          error: 'Group not found'
        };
        res.status(404).json(response);
        return;
      }

      const groupModel = Group.fromDatabase(group);
      groupModel.addMember(memberId);
      
      await this.db.update('activity_groups', Number(id), groupModel.toDatabase());

      // Update group_assigned in registrations table
      await this.db.update('registrations', Number(memberId), { group_assigned: Number(id) });

      const response: ApiResponse = {
        success: true,
        data: groupModel.toJSON(),
        message: 'Member added to group successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error adding member to group:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to add member to group'
      };
      res.status(500).json(response);
    }
  }

  // Remove member from group
  async removeMemberFromGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { memberId } = req.body;
      
      const group = await this.db.findById('activity_groups', Number(id));
      if (!group) {
        const response: ApiResponse = {
          success: false,
          error: 'Group not found'
        };
        res.status(404).json(response);
        return;
      }

      const groupModel = Group.fromDatabase(group);
      groupModel.removeMember(memberId);
      
      await this.db.update('activity_groups', Number(id), groupModel.toDatabase());

      // Update group_assigned in registrations table (set to NULL)
      await this.db.update('registrations', Number(memberId), { group_assigned: null });

      const response: ApiResponse = {
        success: true,
        data: groupModel.toJSON(),
        message: 'Member removed from group successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error removing member from group:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to remove member from group'
      };
      res.status(500).json(response);
    }
  }
}
