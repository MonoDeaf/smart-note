export class TaskManager {
  constructor(storage) {
    this.storage = storage;
    this.groups = new Map();
    this.currentGroup = null;
  }

  loadData() {
    const data = this.storage.getData();
    if (data && data.groups) {
      data.groups.forEach(group => {
        const tasksMap = new Map();
        if (Array.isArray(group.tasks)) {
          group.tasks.forEach(task => {
            tasksMap.set(task.id, {
              ...task,
              createdAt: new Date(task.createdAt),
              completedAt: task.completedAt ? new Date(task.completedAt) : null,
              dueDate: task.dueDate ? new Date(task.dueDate) : null
            });
          });
        }
        
        this.groups.set(group.id, {
          id: group.id,
          name: group.name,
          background: group.background, 
          tasks: tasksMap,
          stats: group.stats || {
            complete: 0,
            incomplete: 0
          }
        });
      });
    }
  }

  createGroup(name, background) {
    const group = {
      id: Date.now().toString(),
      name,
      background: background || { type: 'color', value: '#ffffff' }, 
      tasks: new Map(),
      stats: {
        complete: 0,
        incomplete: 0
      }
    };
    this.groups.set(group.id, group);
    this.saveData();
    return group;
  }

  createTask(groupId, title) {
    const task = {
      id: Date.now().toString(),
      title,
      completed: false,
      createdAt: new Date(),
      completedAt: null
    };
    
    const group = this.groups.get(groupId);
    if (group) {
      group.tasks.set(task.id, task);
      group.stats.incomplete++;
      this.saveData();
    }
    return task;
  }

  toggleTask(groupId, taskId) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date() : null;
        group.stats[task.completed ? 'complete' : 'incomplete']++;
        group.stats[task.completed ? 'incomplete' : 'complete']--;
        this.saveData();
      }
    }
  }

  markAllTasksComplete(groupId) {
    const group = this.groups.get(groupId);
    if (group) {
      group.tasks.forEach(task => {
        if (!task.completed) {
          task.completed = true;
          task.completedAt = new Date();
          group.stats.complete++;
          group.stats.incomplete--;
        }
      });
      this.saveData();
    }
  }

  getGroupStats(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const today = new Date();
    const lastWeek = new Array(7).fill(0).map((_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const stats = lastWeek.map(date => {
      const tasksUpToDate = Array.from(group.tasks.values()).filter(task => 
        new Date(task.createdAt) <= date
      );

      const completed = Array.from(group.tasks.values()).filter(task => 
        task.completedAt && 
        new Date(task.completedAt).toDateString() === date.toDateString()
      ).length;

      const created = Array.from(group.tasks.values()).filter(task =>
        new Date(task.createdAt).toDateString() === date.toDateString()
      ).length;

      return {
        date: date.toLocaleDateString(),
        completed,
        created,
        total: tasksUpToDate.length
      };
    });

    return stats;
  }

  deleteTask(groupId, taskId) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        if (task.completed) {
          group.stats.complete--;
        } else {
          group.stats.incomplete--;
        }
        group.tasks.delete(taskId);
        this.saveData();
      }
    }
  }

  saveData() {
    const data = {
      groups: Array.from(this.groups.values()).map(group => ({
        id: group.id,
        name: group.name,
        background: group.background, 
        stats: group.stats,
        tasks: Array.from(group.tasks.values()).map(task => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          completedAt: task.completedAt ? task.completedAt.toISOString() : null,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null
        }))
      }))
    };
    this.storage.saveData(data);
  }

  deleteGroup(groupId) {
    this.groups.delete(groupId);
    this.saveData();
  }

  getAllTaskStats() {
    const today = new Date();
    const lastWeek = new Array(7).fill(0).map((_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const stats = lastWeek.map(date => {
      let completed = 0;
      let created = 0;
      let total = 0;

      this.groups.forEach(group => {
        Array.from(group.tasks.values()).forEach(task => {
          if (task.completedAt && 
              task.completedAt.toDateString() === date.toDateString()) {
            completed++;
          }
          if (task.createdAt.toDateString() === date.toDateString()) {
            created++;
          }
          if (task.createdAt <= date) {
            total++;
          }
        });
      });

      return {
        date: date.toLocaleDateString(),
        completed,
        created,
        total
      };
    });

    return stats;
  }

  getTotalStats() {
    let totalTasks = 0;
    let completedTasks = 0;
    let uncompletedTasks = 0;
    const hourlyActivity = new Array(8).fill(0);
    const weekdayActivity = new Array(7).fill(0);
    let streakDays = [];
    let longestStreak = 0;
    let currentStreak = 0;
  
    const activityByHour = new Array(24).fill(0);
    const activityByDay = {
      'Sunday': 0, 'Monday': 0, 'Tuesday': 0,
      'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0
    };
  
    let totalCompletionTime = 0;
    let completionTimeCount = 0;

    this.groups.forEach(group => {
      group.tasks.forEach(task => {
        totalTasks++;
      
        if (task.completed) {
          completedTasks++;
        
          if (task.completedAt && task.createdAt) {
            const completionTime = task.completedAt - task.createdAt;
            totalCompletionTime += completionTime;
            completionTimeCount++;
          }
        
          if (task.completedAt) {
            const hour = task.completedAt.getHours();
            activityByHour[hour]++;
            hourlyActivity[Math.floor(hour / 3)]++;
          
            const day = task.completedAt.toLocaleDateString('en-US', { weekday: 'long' });
            activityByDay[day]++;
            weekdayActivity[task.completedAt.getDay()]++;
          }
        
          const completedDate = task.completedAt.toDateString();
          if (streakDays.includes(completedDate)) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
          } else {
            currentStreak = 1;
            streakDays.push(completedDate);
          }
        } else {
          uncompletedTasks++;
        }
      });
    });

    let peakHour = activityByHour.indexOf(Math.max(...activityByHour));
    const peakTime = `${peakHour % 12 || 12}${peakHour < 12 ? 'am' : 'pm'}`;
  
    const mostActiveDay = Object.entries(activityByDay)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
  
    const avgCompletionTime = completionTimeCount > 0 
      ? this.formatDuration(totalCompletionTime / completionTimeCount)
      : 'N/A';

    return {
      total: totalTasks,
      completed: completedTasks,
      uncompleted: uncompletedTasks,
      completionRate: totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0,
      mostActiveDay,
      peakActivityTime: peakTime,
      avgCompletionTime,
      longestStreak,
      hourlyActivity,
      weekdayActivity
    };
  }

  formatDuration(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
  
    return `${minutes}m`;
  }

  saveNoteContent(groupId, taskId, content) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        task.notes = content;
        this.saveData();
      }
    }
  }

  getNoteContent(groupId, taskId) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        return task.notes || '';
      }
    }
    return '';
  }

  saveTaskNotes(groupId, taskId, notes) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        task.notes = notes;
        this.saveData();
      }
    }
  }

  getTaskNotes(groupId, taskId) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        return task.notes || '';
      }
    }
    return '';
  }
}